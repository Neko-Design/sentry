import React from 'react';
import {extractMultilineFields} from '../../utils';
import {t, tct, tn} from '../../locale';
import getDynamicText from '../../utils/getDynamicText';

// Export route to make these forms searchable by label/help
export const route = '/settings/organization/:orgId/project/:projectId/settings/';

const getResolveAgeAllowedValues = () => {
  let i = 0;
  let values = [];
  while (i <= 720) {
    values.push(i);
    if (i < 12) {
      i += 1;
    } else if (i < 24) {
      i += 3;
    } else if (i < 36) {
      i += 6;
    } else if (i < 48) {
      i += 12;
    } else {
      i += 24;
    }
  }
  return values;
};

const RESOLVE_AGE_ALLOWED_VALUES = getResolveAgeAllowedValues();

const ORG_DISABLED_REASON = t(
  "This option is enforced by your organization's settings and cannot be customized per-project."
);

// Check if a field has been set AND IS TRUTHY at the organization level.
const hasOrgOverride = ({organization, name}) => organization[name];

export const fields = {
  name: {
    name: 'name',
    type: 'string',
    required: true,

    label: t('Legacy Name'),
    placeholder: t('My Service Name'),
    help: tct(
      '[Deprecated] In the future, only [Name] will be used to identify your project',
      {
        Deprecated: <strong>DEPRECATED</strong>,
        Name: <strong>Name</strong>,
      }
    ),
  },
  slug: {
    name: 'slug',
    type: 'string',
    required: true,
    label: t('Name'),
    placeholder: t('my-service-name'),
    help: t('A unique ID used to identify this project'),
  },
  team: {
    name: 'team',
    type: 'array',
    label: t('Team'),
    visible: ({organization}) => {
      let features = new Set(organization.features);
      return !features.has('new-teams') && organization.teams.length > 1;
    },
    choices: ({organization}) =>
      organization.teams.filter(o => o.isMember).map(o => [o.slug, o.slug]),
    help: t('Update the team that owns this project'),
  },

  subjectTemplate: {
    name: 'subjectTemplate',
    type: 'string',
    label: t('Subject Prefix'),
    help: t('Choose a custom prefix for emails from this project'),
  },

  defaultEnvironment: {
    name: 'defaultEnvironment',
    type: 'string',
    label: t('Default Environment'),
    placeholder: t('production'),
    help: t('The default selected environment when viewing issues'),
  },
  resolveAge: {
    name: 'resolveAge',
    type: 'range',
    allowedValues: RESOLVE_AGE_ALLOWED_VALUES,
    label: t('Auto Resolve'),
    help: t(
      "Automatically resolve an issue if it hasn't been seen for this amount of time"
    ),
    formatLabel: val => {
      val = parseInt(val, 10);
      if (val === 0) {
        return t('Disabled');
      } else if (val > 23 && val % 24 === 0) {
        // Based on allowed values, val % 24 should always be true
        val = val / 24;
        return tn('%d day', '%d days', val);
      }
      return tn('%d hour', '%d hours', val);
    },
  },

  dataScrubber: {
    name: 'dataScrubber',
    type: 'boolean',
    label: t('Data Scrubber'),
    disabled: hasOrgOverride,
    disabledReason: ORG_DISABLED_REASON,
    help: t('Enable server-side data scrubbing'),
    // `props` are the props given to FormField
    setValue: (val, props) =>
      (props.organization && props.organization[props.name]) || val,
  },
  dataScrubberDefaults: {
    name: 'dataScrubberDefaults',
    type: 'boolean',
    disabled: hasOrgOverride,
    disabledReason: ORG_DISABLED_REASON,
    label: t('Use Default Scrubbers'),
    help: t(
      'Apply default scrubbers to prevent things like passwords and credit cards from being stored'
    ),
    // `props` are the props given to FormField
    setValue: (val, props) =>
      (props.organization && props.organization[props.name]) || val,
  },
  scrubIPAddresses: {
    name: 'scrubIPAddresses',
    type: 'boolean',
    disabled: hasOrgOverride,
    disabledReason: ORG_DISABLED_REASON,
    // `props` are the props given to FormField
    setValue: (val, props) =>
      (props.organization && props.organization[props.name]) || val,
    label: t('Prevent Storing of IP Addresses'),
    help: t('Preventing IP addresses from being stored for new events'),
  },
  sensitiveFields: {
    name: 'sensitiveFields',
    type: 'string',
    multiline: true,
    placeholder: t('email'),
    label: t('Additional Sensitive Fields'),
    help: t(
      'Additional field names to match against when scrubbing data. Separate multiple entries with a newline'
    ),
    getValue: val => extractMultilineFields(val),
    setValue: val => (val && typeof val.join === 'function' && val.join('\n')) || '',
  },
  safeFields: {
    name: 'safeFields',
    type: 'string',
    multiline: true,
    placeholder: t('business-email'),
    label: t('Safe Fields'),
    help: t(
      'Field names which data scrubbers should ignore. Separate multiple entries with a newline'
    ),
    getValue: val => extractMultilineFields(val),
    setValue: val => (val && typeof val.join === 'function' && val.join('\n')) || '',
  },

  allowedDomains: {
    name: 'allowedDomains',
    type: 'string',
    multiline: true,
    placeholder: t('https://example.com or example.com'),
    label: t('Allowed Domains'),
    help: t('Separate multiple entries with a newline'),
    getValue: val => extractMultilineFields(val),
    setValue: val => (val && typeof val.join === 'function' && val.join('\n')) || '',
  },
  scrapeJavaScript: {
    name: 'scrapeJavaScript',
    type: 'boolean',
    label: t('Enable JavaScript source fetching'),
    help: t('Allow Sentry to scrape missing JavaScript source context when possible'),
  },
  securityToken: {
    name: 'securityToken',
    type: 'string',
    label: t('Security Token'),
    help: t(
      'Outbound requests matching Allowed Domains will have the header "{token_header}: {token}" appended'
    ),
    setValue: value => getDynamicText({value, fixed: '__SECURITY_TOKEN__'}),
  },
  securityTokenHeader: {
    name: 'securityTokenHeader',
    type: 'string',
    placeholder: t('X-Sentry-Token'),
    label: t('Security Token Header'),
    help: t(
      'Outbound requests matching Allowed Domains will have the header "{token_header}: {token}" appended.'
    ),
  },
  verifySSL: {
    name: 'verifySSL',
    type: 'boolean',
    label: t('Verify TLS/SSL'),
    help: t('Outbound requests will verify TLS (sometimes known as SSL) connections.'),
  },
};
