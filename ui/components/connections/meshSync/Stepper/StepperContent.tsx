import React, { useEffect, useRef, useState } from 'react';
import {
  Checkbox,
  MenuItem,
  ListItemText,
  Select,
  Typography,
  FormControl,
  InputLabel,
  OutlinedInput,
  Box,
} from '@sistent/sistent';

import {
  ConnectionDetailContent,
  FinishContent,
  CredentialDetailContent,
  SelectConnectionTypeContent,
} from './constants';
import StepperContent from './StepperContentWrapper';
import RJSFWrapper from '../../../meshery-mesh-interface/PatternService/RJSF_wrapper';
import ConnectionWizardArrayFieldTemplate from './ConnectionWizardArrayFieldTemplate';
import { selectCompSchema } from '@/components/shared/FormFields/rjsf-utils/common';
import { JsonParse, randomPatternNameGenerator } from '../../../../utils/utils';
import Notification from './Notification';
import {
  useConnectToConnectionMutation,
  useVerifyAndRegisterConnectionMutation,
  useAddKubernetesConfigMutation,
} from '@/rtk-query/connection';
import { useGetCredentialsQuery } from '@/rtk-query/credentials';
import { useGetComponentsQuery } from '@/rtk-query/meshModel';
import { useNotification } from '@/utils/hooks/useNotification';
import { EVENT_TYPES } from 'lib/event-types';

export const SelectConnection = ({ setSharedData, handleNext }) => {
  const formRef = useRef();
  const [registerConnection] = useVerifyAndRegisterConnectionMutation();
  const { data: componentsData } = useGetComponentsQuery({
    params: { pagesize: 'all' },
  });

  // Dynamically build the list of connection types from the MeshModel registry.
  // Kubernetes is always included as a special case even if the registry doesn't list a KubernetesConnection.
  const connectionTypes = React.useMemo(() => {
    const types = (componentsData?.components || [])
      .filter((c) => c.component.kind.endsWith('Connection') && c.component.kind !== 'Connection')
      .map((c) => c.component.kind.replace(/Connection$/, ' Connection').trim());

    if (!types.includes('Kubernetes Connection')) {
      types.push('Kubernetes Connection');
    }
    return Array.from(new Set(types)).sort();
  }, [componentsData]);

  const schema = React.useMemo(
    () =>
      selectCompSchema(
        connectionTypes,
        'Select one of the available Connection type',
        'Select type of Connection to register',
        'selectedConnectionType',
      ),
    [connectionTypes],
  );

  const handleRegisterConnection = async (kindName) => {
    // Kubernetes uses a kubeconfig file upload — skip the initialize API call
    // and let the next step (ConnectionDetails) handle the upload directly.
    if (kindName.toLowerCase() === 'kubernetes') {
      setSharedData((prevState) => ({
        ...prevState,
        kind: 'kubernetes',
      }));
      handleNext();
      return;
    }

    try {
      const payload = {
        body: {
          kind: kindName,
          status: 'initialize',
        },
      };

      const result = await registerConnection(payload).unwrap();

      const schemaObj = {
        connection: JsonParse(result?.connection?.component?.schema ?? result?.connection?.schema),
        credential: JsonParse(result?.credential?.component?.schema ?? result?.credential?.schema),
      };

      setSharedData((prevState) => ({
        ...prevState,
        connection: result,
        schemas: schemaObj,
        kind: kindName.toLowerCase(),
      }));

      handleNext();
    } catch (error) {
      console.error('Failed to register connection:', error);
    }
  };

  const handleCallback = () => {
    handleNext();
  };

  const handleChange = (data) => {
    if (data.selectedConnectionType) {
      // Strip the ' Connection' or 'Connection' suffix (with or without space)
      // to get the clean kind name, then lowercase it for the API.
      // e.g. 'BigQuery Connection' → 'bigquery'
      //      'PrometheusConnection' → 'prometheus'
      let kindName = data.selectedConnectionType.trim();
      if (kindName.toLowerCase() !== 'connection') {
        kindName = kindName.replace(/ ?Connection$/i, '').trim();
      }
      handleRegisterConnection(kindName);
    }
  };

  return (
    <StepperContent {...SelectConnectionTypeContent} handleCallback={handleCallback}>
      <RJSFWrapper
        key="select-connection-type-rjsf-form"
        jsonSchema={schema}
        liveValidate={false}
        formRef={formRef}
        onChange={handleChange}
        templates={{ ArrayFieldTemplate: ConnectionWizardArrayFieldTemplate }}
      />
    </StepperContent>
  );
};

export const ConnectionDetails = ({ sharedData, setSharedData, handleNext, onClose }) => {
  const formRef = useRef();
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  // stores selected endpoint just before dropdown is closed
  const [prevSelectedEndpoint, setPrevSelectedEndpoint] = useState(null);
  // Local form state — only committed to sharedData on Next click to avoid
  // re-rendering the RJSF form (and losing focus) on every keystroke.
  const [localFormData, setLocalFormData] = useState(sharedData?.componentForm ?? {});

  // --- Kubernetes kubeconfig upload state ---
  const [k8sFile, setK8sFile] = useState(null);
  const [k8sFileName, setK8sFileName] = useState('');
  const [addK8sConfig, { isLoading: isK8sLoading }] = useAddKubernetesConfigMutation();
  const { notify } = useNotification();

  useEffect(() => {
    // Capitalize kind for display: 'prometheus' → 'Prometheus', 'bigquery' → 'Bigquery'
    const kindDisplay = sharedData?.kind
      ? sharedData.kind.charAt(0).toUpperCase() + sharedData.kind.slice(1)
      : '';
    ConnectionDetailContent.title = `Connecting to ${kindDisplay}`;
  }, [sharedData?.kind]);

  const handleCallback = () => {
    // Commit local form data to shared state right before advancing
    setSharedData((prevState) => ({
      ...prevState,
      componentForm: localFormData,
    }));
    handleNext();
  };

  const cancelCallback = () => {
    onClose();
  };

  const handleSelectEndpoint = (e) => {
    setSharedData((prevState) => ({
      ...prevState,
      componentForm: {
        name: randomPatternNameGenerator(),
        url: e.target.value,
      },
    }));

    setSelectedEndpoint(e.target.value);
    setPrevSelectedEndpoint(e.target.value);
  };

  const handleClose = () => {
    if (prevSelectedEndpoint === selectedEndpoint) {
      setSelectedEndpoint(null);
      setPrevSelectedEndpoint(null);
    }
  };

  const handleChange = (data) => {
    // Update local state only — do NOT call setSharedData here.
    // Calling setSharedData triggers parent re-renders which cause RJSF
    // to receive new props and reset the form, losing input focus.
    setLocalFormData(data);
  };

  // --- Kubernetes upload handlers ---
  const handleK8sFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setK8sFile(file);
      setK8sFileName(file.name);
    }
  };

  const handleK8sUpload = async () => {
    if (!k8sFile) return;
    const formData = new FormData();
    formData.append('k8sfile', k8sFile);
    try {
      await addK8sConfig({ body: formData }).unwrap();
      notify({
        message: 'Kubernetes config uploaded successfully.',
        event_type: EVENT_TYPES.SUCCESS,
      });
      handleNext();
    } catch (err) {
      notify({
        message: `Failed to upload kubeconfig: ${err?.data || err}`,
        event_type: EVENT_TYPES.ERROR,
      });
    }
  };

  // For Kubernetes: Next is disabled until a file is selected
  // For others: disabled until the RJSF form has any data
  const isDisabledNextButton =
    sharedData?.kind?.toLowerCase() === 'kubernetes'
      ? !k8sFile
      : !localFormData || Object.keys(localFormData).length === 0;

  // Kubernetes gets a dedicated kubeconfig upload UI
  if (sharedData?.kind?.toLowerCase() === 'kubernetes') {
    return (
      <StepperContent
        {...ConnectionDetailContent}
        handleCallback={handleK8sUpload}
        disabled={isDisabledNextButton || isK8sLoading}
        cancelCallback={cancelCallback}
        btnText={isK8sLoading ? 'Uploading...' : 'Next'}
      >
        <Typography variant="body2" style={{ marginBottom: '1rem' }}>
          Upload your kubeconfig file (commonly found at <code>~/.kube/config</code>)
        </Typography>
        <Box
          style={{
            border: '1px dashed #00B39F',
            borderRadius: 8,
            padding: '1.5rem',
            textAlign: 'center',
            cursor: 'pointer',
          }}
          onClick={() => document.getElementById('k8sfile-wizard')?.click()}
        >
          <input
            id="k8sfile-wizard"
            type="file"
            style={{ display: 'none' }}
            accept=".yaml,.yml,.json,"
            onChange={handleK8sFileChange}
          />
          {k8sFileName ? (
            <Typography variant="body2" style={{ color: '#00B39F' }}>
              ✅ {k8sFileName}
            </Typography>
          ) : (
            <Typography variant="body2" style={{ opacity: 0.6 }}>
              Click to select kubeconfig file
            </Typography>
          )}
        </Box>
      </StepperContent>
    );
  }

  // All other connection types: render the schema-driven RJSF form
  return (
    <StepperContent
      {...ConnectionDetailContent}
      handleCallback={handleCallback}
      disabled={isDisabledNextButton}
      cancelCallback={cancelCallback}
    >
      {sharedData?.capabilities && (
        <FormControl fullWidth size="small">
          <InputLabel fontSize="inherit" id="endpoint-checkbox-label">
            Select from the discovered endpoints
          </InputLabel>
          <Select
            labelId="endpoint-checkbox-label"
            id="endpoint-checkbox"
            onChange={handleSelectEndpoint}
            value={selectedEndpoint}
            onClose={handleClose}
            input={<OutlinedInput label="Select discovered endpoint" />}
            renderValue={() => <div>{selectedEndpoint !== null ? selectedEndpoint : ''}</div>}
            MenuProps={{
              anchorOrigin: {
                vertical: 'bottom',
                horizontal: 'left',
              },
              transformOrigin: {
                vertical: 'top',
                horizontal: 'left',
              },
              getContentAnchorEl: null,
              style: {
                maxHeight: 48 * 4.5 + 8,
                width: 250,
                zIndex: 10000,
              },
              PaperProps: {
                style: {
                  zIndex: 10000,
                },
              },
            }}
          >
            {sharedData.capabilities?.urls?.map((endpoint, index) => (
              <MenuItem key={index} value={endpoint} name={endpoint}>
                <Checkbox checked={endpoint === selectedEndpoint} />
                <ListItemText primary={endpoint} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      {sharedData?.capabilities && (
        <p style={{ display: 'flex', justifyContent: 'center' }}>-OR-</p>
      )}
      <RJSFWrapper
        key="register-connection-rjsf-form"
        jsonSchema={sharedData?.schemas?.connection}
        uiSchema={{
          spec: {
            'ui:options': { hideTitle: true },
          },
        }}
        liveValidate={true}
        formRef={formRef}
        disabled={selectedEndpoint !== null ? true : false}
        onChange={handleChange}
        templates={{ ArrayFieldTemplate: ConnectionWizardArrayFieldTemplate }}
      />
    </StepperContent>
  );
};

export const CredentialDetails = ({
  sharedData,
  setSharedData,
  handleNext,
  handleRegistrationComplete,
  onClose,
}) => {
  const { data: credentialsData } = useGetCredentialsQuery();
  const [verifyAndRegisterConnection] = useVerifyAndRegisterConnectionMutation();
  const [connectToConnection] = useConnectToConnectionMutation();
  const [selectedCredential, setSelectedCredential] = useState(null);
  const [prevSelectedCredential, setPrevSelectedCredential] = useState(null);
  const [formState, setFormState] = useState(null);
  const [skipCredentialVerification, setSkipCredentialVerification] = useState(false);
  const [disableVerify, setDisableVerify] = useState(true);
  const [isSuccess, setIsSuccess] = React.useState(null);
  const formRef = useRef();

  useEffect(() => {
    CredentialDetailContent.title = `Credential for ${sharedData?.kind}`;
  }, [sharedData.kind]);

  const verifyConnection = async () => {
    let credential = {};
    if (selectedCredential === null) {
      credential = formState;
    } else {
      credential = {
        secret: selectedCredential?.secret?.secret,
        name: selectedCredential?.name,
      };
      credential.id = selectedCredential?.id;
    }

    try {
      const payload = {
        body: {
          skip_credential_verification: skipCredentialVerification,
          kind: sharedData?.kind,
          name: sharedData?.componentForm?.name,
          type: sharedData?.connection?.connection?.model?.category?.name?.toLowerCase(),
          sub_type: sharedData?.connection?.connection?.model?.subCategory?.toLowerCase(),
          metadata: sharedData?.componentForm,
          credential_secret: credential,
          id: sharedData?.connection?.id,
          status: 'register',
        },
      };

      const result = await verifyAndRegisterConnection(payload).unwrap();

      if (result === '') {
        setIsSuccess(true);
        handleConnectToConnection();
      } else {
        setIsSuccess(false);
      }
    } catch (error) {
      console.error('Error verifying connection:', error);
      setIsSuccess(false);
    }
  };

  const handleConnectToConnection = async () => {
    let credential = {};
    if (selectedCredential === null) {
      credential = formState;
    } else {
      credential = {
        name: selectedCredential?.name,
        secret: selectedCredential?.secret?.secret,
      };
      credential.id = selectedCredential?.id;
    }

    try {
      const payload = {
        body: {
          kind: sharedData?.kind,
          name: sharedData?.componentForm?.name,
          type: sharedData?.connection?.connection?.model?.category?.name?.toLowerCase(),
          sub_type: sharedData?.connection?.connection?.model?.subCategory?.toLowerCase(),
          metadata: sharedData?.componentForm,
          credential_secret: credential,
          id: sharedData?.connection?.id,
          status: 'connect',
        },
      };

      const result = await connectToConnection(payload).unwrap();

      if (result !== undefined && result !== null && result === '') {
        setIsSuccess(true);
      } else {
        setIsSuccess(false);
      }
    } catch (error) {
      console.error('Error connecting to connection:', error);
      setIsSuccess(false);
    }
  };

  const handleCallback = () => {
    if (isSuccess === null || isSuccess === false) {
      verifyConnection();
    } else {
      handleNext();
      handleRegistrationComplete();
    }
  };

  const cancelCallback = () => {
    onClose();
  };

  const handleSelectCredential = (e) => {
    const id = e.target.value;
    const credential = existingCredentials.find((credential) => credential.id === id);
    setSelectedCredential(credential);
    setPrevSelectedCredential(id);
  };

  const handleChange = (data) => {
    setFormState(data);
  };

  const handleClose = () => {
    if (prevSelectedCredential === selectedCredential?.id) {
      setSelectedCredential(null);
      setPrevSelectedCredential(null);
    }
  };

  useEffect(() => {
    if (selectedCredential !== null || (formState !== null && formState['secret']) !== undefined) {
      setDisableVerify(false);
    } else {
      setDisableVerify(true);
    }
  }, [selectedCredential, formState]);

  const allCredentials = credentialsData?.credentials || [];
  // Only show credentials that match the current connection type
  const existingCredentials = allCredentials.filter(
    (c) => c.type?.toLowerCase() === sharedData?.kind?.toLowerCase(),
  );
  const hasCredentialSchema =
    sharedData?.schemas?.credential && Object.keys(sharedData.schemas.credential).length > 0;

  return (
    <StepperContent
      {...CredentialDetailContent}
      handleCallback={handleCallback}
      cancelCallback={cancelCallback}
      disabled={disableVerify}
      btnText={isSuccess === null || isSuccess === false ? 'Verify Connection' : 'Next'}
    >
      {hasCredentialSchema ? (
        <>
          <Typography variant="body2" style={{ paddingLeft: '16px' }}>
            Select an existing credential to use for this connection
          </Typography>
          <FormControl sx={{ width: '100%' }} size="small">
            <InputLabel fontSize="20" id="credential-checkbox-label">
              Select existing credential
            </InputLabel>
            <Select
              labelId="credential-checkbox-label"
              id="credential-checkbox"
              onChange={handleSelectCredential}
              value={selectedCredential?.name}
              onClose={handleClose}
              input={<OutlinedInput label="Select existing credential" />}
              renderValue={() => (
                <div>{selectedCredential !== null ? selectedCredential.name : ''}</div>
              )}
              MenuProps={{
                anchorOrigin: {
                  vertical: 'bottom',
                  horizontal: 'left',
                },
                transformOrigin: {
                  vertical: 'top',
                  horizontal: 'left',
                },
                getContentAnchorEl: null,
                style: {
                  maxHeight: 48 * 4.5 + 8,
                  width: 250,
                  zIndex: 10000,
                },
                PaperProps: {
                  style: {
                    zIndex: 10000,
                  },
                },
              }}
            >
              {existingCredentials &&
                existingCredentials?.map((credential) => (
                  <MenuItem key={credential.id} value={credential.id} name={credential.name}>
                    <Checkbox checked={selectedCredential?.id === credential.id} />
                    <ListItemText primary={credential.name} />
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <p style={{ display: 'flex', justifyContent: 'center' }}>-OR-</p>
          <p>Configure a new credential to use for this connection</p>
          <RJSFWrapper
            key="register-connection-rjsf-form"
            jsonSchema={sharedData?.schemas?.credential}
            liveValidate={true}
            formRef={formRef}
            disabled={selectedCredential !== null ? true : false}
            onChange={handleChange}
            templates={{ ArrayFieldTemplate: ConnectionWizardArrayFieldTemplate }}
          />
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '2rem 0' }}>
          <p>No credentials are required for this connection type.</p>
          <p style={{ color: 'gray', fontSize: '0.9rem' }}>
            Click <b>Verify Connection</b> to finalize and register the connection.
          </p>
        </div>
      )}
      <Box
        style={{
          background: 'rgba(0, 211, 169, 0.05)',
          padding: '0.4rem',
          margin: '1rem 0',
        }}
      >
        <Typography style={{ fontSize: 'inherit' }}>
          <Checkbox
            id="bypass_verification"
            color="success"
            onChange={(e) => {
              setSkipCredentialVerification(e.target.checked);
              setDisableVerify(!e.target.checked);
            }}
          />
          <label fontSize="inherit" for="bypass_verification">
            Bypass connection verification
          </label>
        </Typography>
      </Box>
      {isSuccess !== null && (
        <Notification
          type={isSuccess ? 'success' : 'error'}
          message={`Credential for ${sharedData?.kind} ${
            isSuccess ? 'created' : 'verification failed'
          }`}
          retry={!isSuccess}
          onRetry={() => verifyConnection()}
        />
      )}
    </StepperContent>
  );
};

export const Finish = ({ sharedData, onClose }) => {
  const cancelCallback = () => {
    onClose();
  };

  // Capitalize the kind name for display (e.g. 'prometheus' -> 'Prometheus')
  const kindDisplay = sharedData?.kind
    ? sharedData.kind.charAt(0).toUpperCase() + sharedData.kind.slice(1)
    : 'Connection';

  return (
    <StepperContent
      {...FinishContent}
      subtitle={`Congratulations 🎉, you have registered a new ${kindDisplay} connection.`}
      handleCallback={cancelCallback}
      disabled={false}
    >
      <Box
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          marginTop: '1rem',
        }}
      >
        <Typography
          variant="body2"
          style={{
            color: '#00B39F',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          ✔️ {kindDisplay} connection registered
        </Typography>
        {sharedData?.schemas?.credential && (
          <Typography
            variant="body2"
            style={{
              color: '#00B39F',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            ✔️ Credential associated
          </Typography>
        )}
      </Box>
    </StepperContent>
  );
};
