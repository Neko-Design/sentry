import {browserHistory} from 'react-router';
import PropTypes from 'prop-types';
import React from 'react';
import Reflux from 'reflux';
import createReactClass from 'create-react-class';

import {
  changeOrganizationSlug,
  removeAndRedirectToRemainingOrganization,
  updateOrganization,
} from '../../../../actionCreators/organizations';
import {t, tct} from '../../../../locale';
import ApiMixin from '../../../../mixins/apiMixin';
import Field from '../../components/forms/field';
import LinkWithConfirmation from '../../../../components/linkWithConfirmation';
import LoadingError from '../../../../components/loadingError';
import LoadingIndicator from '../../../../components/loadingIndicator';
import OrganizationsStore from '../../../../stores/organizationsStore';
import Panel from '../../components/panel';
import PanelHeader from '../../components/panelHeader';
import SettingsPageHeader from '../../components/settingsPageHeader';
import TextBlock from '../../components/text/textBlock';
import recreateRoute from '../../../../utils/recreateRoute';

const OrganizationGeneralSettingsView = createReactClass({
  displayName: 'OrganizationGeneralSettingsView',

  propTypes: {
    routes: PropTypes.arrayOf(PropTypes.object),
  },

  mixins: [ApiMixin, Reflux.connect(OrganizationsStore, 'organizations')],

  getInitialState() {
    return {
      loading: true,
      error: false,
      data: null,
    };
  },

  componentDidMount() {
    let fetchForm = import(/*webpackChunkName: "organizationSettingsForm"*/ './organizationSettingsForm').then(
      mod => mod.default
    );

    Promise.all([this.fetchData(), fetchForm]).then(
      ([data, Form]) => {
        // Redirect if can't write to org
        if (
          data &&
          data.access.indexOf('org:admin') === -1 &&
          data.access.indexOf('org:write') === -1
        ) {
          browserHistory.push(
            recreateRoute('teams', {
              params: this.props.params,
              routes: this.props.routes,
              stepBack: -1,
            })
          );
          return;
        }

        this.setState({data, loading: false, Form});
      },
      () => {
        this.setState({error: true, loading: false});
      }
    );
  },

  fetchData() {
    return new Promise((resolve, reject) => {
      this.api.request(`/organizations/${this.props.params.orgId}/`, {
        method: 'GET',
        success: data => {
          resolve(data);
        },
        error: () => {
          reject();
        },
      });
    });
  },

  handleRemoveOrganization() {
    let {data} = this.state || {};
    if (!data) return;

    // Can't remove if this is only org
    let allOrgs = OrganizationsStore.getAll();
    if (allOrgs && allOrgs.length < 2) return;

    removeAndRedirectToRemainingOrganization(this.api, {
      orgId: this.props.params.orgId,
      successMessage: `${data.name} is queued for deletion.`,
      errorMessage: `Error removing the ${data && data.name} organization`,
    });
  },

  handleSave(prevData, data) {
    if (data.slug && data.slug !== prevData.slug) {
      changeOrganizationSlug(prevData, data);
      browserHistory.replace(`/settings/organization/${data.slug}/settings/`);
    } else {
      // TODO(dcramer): this should propagate
      this.setState({data});
      // Ugh `data` here is different than data in OrganizationsStore
      updateOrganization(data);
    }
  },

  render() {
    let {data, loading, error, Form, organizations} = this.state;
    let orgId = this.props.params.orgId;
    let access = data && new Set(data.access);

    let hasProjects = data && data.projects && !!data.projects.length;
    let hasMultipleOrgs = data && organizations.length > 1;

    return (
      <div>
        {loading && <LoadingIndicator />}
        {error && <LoadingError />}

        {!loading &&
          !error &&
          Form && (
            <div>
              <SettingsPageHeader title={t('Organization Settings')} />
              <Form
                {...this.props}
                initialData={data}
                orgId={orgId}
                access={access}
                onSave={this.handleSave}
              />

              {access.has('org:admin') &&
                !data.isDefault &&
                hasMultipleOrgs && (
                  <Panel>
                    <PanelHeader>{t('Remove Organization')}</PanelHeader>
                    <Field
                      label={t('Remove Organization')}
                      help={t(
                        'Removing this organization will delete all data including projects and their associated events.'
                      )}
                    >
                      <div>
                        <LinkWithConfirmation
                          className="btn btn-danger"
                          priority="danger"
                          size="small"
                          title={t('Remove %s organization', data && data.name)}
                          message={
                            <div>
                              <TextBlock>
                                {tct(
                                  'Removing the organization, [name] is permanent and cannot be undone! Are you sure you want to continue?',
                                  {
                                    name: data && <strong>{data.name}</strong>,
                                  }
                                )}
                              </TextBlock>

                              {hasProjects && (
                                <div>
                                  <TextBlock noMargin>
                                    {t(
                                      'This will also remove the following associated projects:'
                                    )}
                                  </TextBlock>
                                  <ul className="ref-projects">
                                    {data.projects.map(project => (
                                      <li key={project.slug}>{project.slug}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          }
                          onConfirm={this.handleRemoveOrganization}
                        >
                          {t('Remove Organization')}
                        </LinkWithConfirmation>
                      </div>
                    </Field>
                  </Panel>
                )}
            </div>
          )}
      </div>
    );
  },
});

export default OrganizationGeneralSettingsView;
