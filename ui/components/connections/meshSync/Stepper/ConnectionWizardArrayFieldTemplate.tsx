import React from 'react';
import { Box, Grid2, Paper, IconButton, Typography, useTheme } from '@sistent/sistent';
import AddIcon from '../../../../assets/icons/AddIcon';
import { CustomTextTooltip } from '../../../meshery-mesh-interface/PatternService/CustomTextTooltip';
import HelpOutlineIcon from '../../../../assets/icons/HelpOutlineIcon';
import { isMultiSelect, getDefaultFormState } from '@rjsf/utils';
import { iconSmall } from '../../../../css/icons.styles';
import {
  safeDisplayValue,
  safeStringTitle,
} from '../../../meshery-mesh-interface/PatternService/helper';

function getTitle(props) {
  if (!props) return 'Unknown';
  return safeStringTitle(props.uiSchema?.['ui:title'] ?? props.title) || 'Unknown';
}

const ConnectionWizardArrayFieldTemplate = (props) => {
  const { schema, registry = getDefaultFormState() } = props;
  const safeProps = { ...props, idSchema: props.idSchema ?? { $id: 'array-field' } };
  if (isMultiSelect(schema, registry.rootSchema)) {
    return <DefaultFixedArrayFieldTemplate {...safeProps} />;
  } else {
    return <DefaultNormalArrayFieldTemplate {...safeProps} />;
  }
};

const ArrayFieldTitle = ({ title }) => {
  const safeTitle = safeStringTitle(title);
  if (!safeTitle) return null;
  return (
    <Typography
      variant="body1"
      style={{
        fontWeight: 'bold',
        display: 'inline',
      }}
    >
      {safeTitle}
    </Typography>
  );
};

const DefaultFixedArrayFieldTemplate = (props) => {
  const safeId = props.idSchema?.$id ?? 'array-field';
  return (
    <fieldset className={props.className}>
      {props.canAdd && (
        <IconButton
          className="array-item-add"
          onClick={typeof props.onAddClick === 'function' ? props.onAddClick : undefined}
          disabled={props.disabled || props.readonly}
        >
          <AddIcon width="18px" height="18px" fill="gray" />
        </IconButton>
      )}

      <ArrayFieldTitle title={getTitle(props)} />

      {(props.uiSchema?.['ui:description'] ?? props.schema?.description) != null && (
        <div className="field-description" key={`field-description-${safeId}`}>
          {safeDisplayValue(props.uiSchema?.['ui:description'] ?? props.schema?.description)}
        </div>
      )}

      <div className="row array-item-list" key={`array-item-list-${safeId}`}>
        {props.items}
      </div>
    </fieldset>
  );
};

const DefaultNormalArrayFieldTemplate = (props) => {
  const theme = useTheme();
  const safeId = props.idSchema?.$id ?? 'array-field';

  return (
    <Paper
      elevation={0}
      style={{
        backgroundColor: theme.palette.background.paper,
        padding: theme.spacing(2),
        border: `1px solid ${theme.palette.divider || theme.palette.text.disabled}`,
        borderRadius: '0.25rem',
      }}
    >
      <Box p={2}>
        <Grid2
          container={true}
          key={`array-item-list-${safeId}`}
          alignItems="center"
          justifyContent="space-between"
          size="grow"
        >
          <Grid2 size={{ xs: 4 }}>
            <ArrayFieldTitle title={getTitle(props)} />

            {(props.uiSchema?.['ui:description'] ?? props.schema?.description) != null && (
              <CustomTextTooltip
                title={safeStringTitle(
                  props.uiSchema?.['ui:description'] ?? props.schema?.description,
                )}
              >
                <IconButton disableTouchRipple="true" disableRipple="true">
                  <HelpOutlineIcon
                    width="14px"
                    height="14px"
                    fill={theme.palette.icon?.default || 'gray'}
                    style={{ marginLeft: '4px', ...iconSmall }}
                  />
                </IconButton>
              </CustomTextTooltip>
            )}
          </Grid2>

          <Grid2 size={{ xs: 4 }}>
            {props.canAdd && (
              <Grid2 container justify="flex-end">
                <Grid2>
                  <IconButton
                    className="array-item-add"
                    onClick={typeof props.onAddClick === 'function' ? props.onAddClick : undefined}
                    disabled={props.disabled || props.readonly}
                  >
                    <AddIcon
                      width="18px"
                      height="18px"
                      fill={theme.palette.icon?.default || 'gray'}
                    />
                  </IconButton>
                </Grid2>
              </Grid2>
            )}
          </Grid2>
        </Grid2>

        {props.schema?.description && (
          <Grid2 container={true} size="grow">
            <Grid2 size={{ xs: 12 }}>
              <Typography variant="body2" style={{ color: theme.palette.text.secondary }}>
                {props.schema.description}
              </Typography>
            </Grid2>
          </Grid2>
        )}

        <Grid2 container={true} key={`array-item-list-${safeId}`} size={'grow'}>
          {props.items}
        </Grid2>
      </Box>
    </Paper>
  );
};

export default ConnectionWizardArrayFieldTemplate;
