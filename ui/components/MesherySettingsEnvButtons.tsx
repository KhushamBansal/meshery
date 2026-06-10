import { Button, Typography, Tooltip, Grid2, Box, styled } from '@sistent/sistent';
import React, { useState } from 'react';
import AddIconCircleBorder from '../assets/icons/AddIconCircleBorder';
import { CONNECTION_STATES } from '../utils/Enum';
import { TooltipWrappedConnectionChip, ConnectionStateChip } from './connections/ConnectionChip';
import useKubernetesHook from '@/utils/hooks/useKubernetesHook';
import { keys } from '@/utils/permission_constants';
import useTestIDsGenerator from '@/utils/hooks/useTestIDs';
import CAN from '@/utils/can';
import RegisterConnectionModal from './connections/RegisterConnectionModal';

const styles = styled((theme) => ({
  ctxIcon: {
    display: 'inline',
    verticalAlign: 'text-top',
    width: theme.spacing(2.5),
    marginLeft: theme.spacing(0.5),
  },
  chip: {
    height: '50px',
    fontSize: '15px',
    position: 'relative',
    top: theme.spacing(0.5),
    [theme.breakpoints.down('md')]: { fontSize: '12px' },
  },
}));

const MesherySettingsEnvButtons = () => {
  const [wizardOpen, setWizardOpen] = useState(false);
  const testIDs = useTestIDsGenerator('connection');

  return (
    <div>
      <Button
        type="submit"
        variant="contained"
        onClick={() => setWizardOpen(true)}
        style={{
          width: '100%',
          borderRadius: 5,
          padding: '8px',
        }}
        disabled={!CAN(keys.ADD_CLUSTER.action, keys.ADD_CLUSTER.subject)}
        data-cy="btnResetDatabase"
      >
        <AddIconCircleBorder style={{ width: '20px', height: '20px' }} />
        <Typography
          style={{
            paddingLeft: '4px',
            width: 'max-content',
            marginRight: '4px',
          }}
          data-testid={testIDs('addCluster')}
        >
          Register Connection
        </Typography>
      </Button>
      <RegisterConnectionModal
        openRegistrationModal={wizardOpen}
        connectionData={{}}
        handleRegistrationModalClose={() => setWizardOpen(false)}
      />
    </div>
  );
};

const ShowDiscoveredContexts = ({
  registeredContexts,
  connectedContexts,
  ignoredContexts,
  dataTestid,
}) => {
  const ping = useKubernetesHook();

  return (
    <Grid2
      spacing={2}
      columns={1}
      data-testid={dataTestid}
      sx={{ flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
    >
      {registeredContexts.length > 0 && (
        <K8sConnectionItems
          contexts={registeredContexts}
          ping={ping}
          status={CONNECTION_STATES.REGISTERED}
        />
      )}
      {connectedContexts.length > 0 && (
        <K8sConnectionItems
          contexts={connectedContexts}
          ping={ping}
          status={CONNECTION_STATES.CONNECTED}
        />
      )}
      {ignoredContexts.length > 0 && (
        <Grid2 size={{ xs: 8 }}>
          <K8sConnectionItems
            contexts={ignoredContexts}
            ping={ping}
            status={CONNECTION_STATES.IGNORED}
          />
        </Grid2>
      )}
    </Grid2>
  );
};

const K8sConnectionItems = ({ status, contexts, ping }) => {
  const classes = styles();
  return (
    <Grid2 container spacing={2} size={'grow'}>
      {contexts.map((context) => (
        <Grid2
          container
          size="grow"
          spacing={1}
          id={context.connectionId}
          key={context.connectionId}
          className={classes.chip}
          sx={{ flexDirection: 'column', alignContent: 'center', alignItems: 'center' }}
        >
          <Box sx={{ minWidth: '25%', maxWidth: '50%' }}>
            <Tooltip title={`Server: ${context.server}`}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-wrap',
                  alignItems: 'center',
                }}
                whiteSpace="no-wrap"
                textOverflow="ellipsis"
              >
                <TooltipWrappedConnectionChip
                  title={context.name}
                  handlePing={() => {
                    ping(context.name, context.server, context.connectionId);
                  }}
                  iconSrc={'/static/img/integrations/kubernetes.svg'}
                />
              </div>
            </Tooltip>
          </Box>
          <Box sx={{ minWidth: '25%', maxWidth: '50%' }}>
            <ConnectionStateChip status={status} />
          </Box>
        </Grid2>
      ))}
    </Grid2>
  );
};
export default MesherySettingsEnvButtons;
