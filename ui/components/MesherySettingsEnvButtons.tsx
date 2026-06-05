import { Button, Typography } from '@sistent/sistent';
import React, { useState } from 'react';
import AddIconCircleBorder from '../assets/icons/AddIconCircleBorder';
import { keys } from '@/utils/permission_constants';
import useTestIDsGenerator from '@/utils/hooks/useTestIDs';
import CAN from '@/utils/can';
import RegisterConnectionModal from './connections/RegisterConnectionModal';

const MesherySettingsEnvButtons = () => {
  const [openRegistrationModal, setRegistrationModal] = useState(false);
  const testIDs = useTestIDsGenerator('connection');

  const handleClick = () => {
    setRegistrationModal(true);
  };

  return (
    <div>
      <Button
        type="submit"
        variant="contained"
        onClick={handleClick}
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
          Create Connection
        </Typography>
      </Button>
      <RegisterConnectionModal
        handleRegistrationModalClose={() => setRegistrationModal(false)}
        openRegistrationModal={openRegistrationModal}
        connectionData={{
          metadata: {},
          kind: '',
        }}
      />
    </div>
  );
};

export default MesherySettingsEnvButtons;
