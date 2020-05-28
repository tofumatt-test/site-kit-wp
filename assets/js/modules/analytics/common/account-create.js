/**
 * AccountCreate component.
 *
 * Site Kit by Google, Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';
import { useCallback, useState, useEffect } from '@wordpress/element';

/**
 * Internal dependencies
 */
import Button from '../../../components/button';
import ProgressBar from '../../../components/progress-bar';
import { trackEvent } from '../../../util';
import TimezoneSelect from './account-create/timezone-select';
import AccountField from './account-create/account-field';
import PropertyField from './account-create/property-field';
import ProfileField from './account-create/profile-field';
import CountrySelect from './account-create/country-select';
import ErrorNotice from './error-notice';
import { STORE_NAME, FORM_ACCOUNT_CREATE, PROVISIONING_SCOPE } from '../datastore/constants';
import { STORE_NAME as CORE_SITE } from '../../../googlesitekit/datastore/site/constants';
import { STORE_NAME as CORE_USER, PERMISSION_SCOPE_ERROR_CODE } from '../../../googlesitekit/datastore/user/constants';
import { countryCodesByTimezone } from '../util/countries-timezones';
import Data from 'googlesitekit-data';

const { useDispatch, useSelect } = Data;

export default function AccountCreate() {
	const accountTicketTermsOfServiceURL = useSelect( ( select ) => select( STORE_NAME ).getAccountTicketTermsOfServiceURL() );
	const canSubmitAccountCreate = useSelect( ( select ) => select( STORE_NAME ).canSubmitAccountCreate() );
	const isDoingCreateAccount = useSelect( ( select ) => select( STORE_NAME ).isDoingCreateAccount() );
	const hasAccountCreateForm = useSelect( ( select ) => select( STORE_NAME ).hasForm( FORM_ACCOUNT_CREATE ) );
	const hasProvisioningScope = useSelect( ( select ) => select( STORE_NAME ).hasProvisioningScope() );
	const siteURL = useSelect( ( select ) => select( CORE_SITE ).getReferenceSiteURL() );
	const siteName = useSelect( ( select ) => select( CORE_SITE ).getSiteName() );
	let timezone = useSelect( ( select ) => select( CORE_SITE ).getTimezone() );

	const [ isNavigating, setIsNavigating ] = useState( false );

	// Redirect if the accountTicketTermsOfServiceURL is set.
	useEffect( () => {
		if ( accountTicketTermsOfServiceURL ) {
			global.location.assign( accountTicketTermsOfServiceURL );
		}
	}, [ accountTicketTermsOfServiceURL ] );

	// Set form defaults on initial render.
	const { setForm } = useDispatch( STORE_NAME );
	useEffect( () => {
		// Only set the form if not already present in store.
		// e.g. after a snapshot has been restored.
		if ( ! hasAccountCreateForm ) {
			const { hostname } = new URL( siteURL );
			timezone = countryCodesByTimezone[ timezone ] ? timezone : Intl.DateTimeFormat().resolvedOptions().timeZone;
			setForm( FORM_ACCOUNT_CREATE, {
				accountName: siteName,
				propertyName: hostname,
				profileName: __( 'All website traffic', 'google-site-kit' ),
				countryCode: countryCodesByTimezone[ timezone ],
				timezone,
			} );
		}
	}, [ hasAccountCreateForm, siteName, siteURL, timezone ] );

	const { createAccount } = useDispatch( STORE_NAME );
	const { setPermissionScopeError } = useDispatch( CORE_USER );
	const handleSubmit = useCallback(
		async () => {
			// If scope not granted, trigger scope error right away. These are
			// typically handled automatically based on API responses, but
			// this particular case has some special handling to improve UX.
			if ( ! hasProvisioningScope ) {
				setPermissionScopeError( {
					code: PERMISSION_SCOPE_ERROR_CODE,
					message: __( 'Additional permissions are required to create a new Analytics account.', 'google-site-kit' ),
					data: {
						status: 403,
						scopes: [ PROVISIONING_SCOPE ],
					},
				} );
				return;
			}

			trackEvent( 'analytics_setup', 'new_account_setup_clicked' );
			const { error } = await createAccount();

			if ( ! error ) {
				setIsNavigating( true );
			}
		},
		[ createAccount, setIsNavigating, hasProvisioningScope, setPermissionScopeError ]
	);

	if ( isDoingCreateAccount || isNavigating || undefined === hasProvisioningScope ) {
		return <ProgressBar />;
	}

	return (
		<div>
			<ErrorNotice />

			<h3 className="googlesitekit-heading-4">
				{ __( 'Create your Analytics account', 'google-site-kit' ) }
			</h3>

			<p>
				{ __( 'We’ve pre-filled the required information for your new account. Confirm or edit any details:', 'google-site-kit' ) }
			</p>

			<div className="googlesitekit-setup-module__inputs">
				<div className="mdc-layout-grid__cell mdc-layout-grid__cell--span-6">
					<AccountField />
				</div>
				<div className="mdc-layout-grid__cell mdc-layout-grid__cell--span-6">
					<PropertyField />
				</div>
				<div className="mdc-layout-grid__cell mdc-layout-grid__cell--span-6">
					<ProfileField />
				</div>
			</div>

			<div className="googlesitekit-setup-module__inputs">
				<CountrySelect />

				<TimezoneSelect />
			</div>

			<p>
				{ hasProvisioningScope && __( 'You will be redirected to Google Analytics to accept the terms of service and create your new account.', 'google-site-kit' ) }
				{ ! hasProvisioningScope && __( 'You will need to give Site Kit permission to create an Analytics account on your behalf and also accept the Google Analytics terms of service.', 'google-site-kit' ) }
			</p>

			<Button
				disabled={ ! canSubmitAccountCreate }
				onClick={ handleSubmit }
			>
				{ __( 'Create Account', 'google-site-kit' ) }
			</Button>
		</div>
	);
}
