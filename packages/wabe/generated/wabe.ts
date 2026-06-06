export enum RoleEnum {
	DashboardAdmin = 'DashboardAdmin',
}

export enum AuthenticationProvider {
	github = 'github',
	google = 'google',
	emailPassword = 'emailPassword',
	phonePassword = 'phonePassword',
	magicLink = 'magicLink',
}

export enum SecondaryFactor {
	emailOTP = 'emailOTP',
	qrcodeOTP = 'qrcodeOTP',
}

export enum MagicLinkIntent {
	signIn = 'signIn',
	signUp = 'signUp',
}

export type ACLObjectUsersACL = {
	userId: string
	read: boolean
	write: boolean
}

export type ACLObject = {
	users?: Array<ACLObjectUsersACL>
	roles?: Array<ACLObjectRolesACL>
}

export type ACLObjectRolesACL = {
	roleId: string
	read: boolean
	write: boolean
}

export type Collection1 = {
	id: string
	name?: string
	acl?: ACLObject
	createdAt?: string
	updatedAt?: string
	search?: Array<string>
}

export type AuthenticationMagicLink = {
	email: string
}

export type Authentication = {
	magicLink?: AuthenticationMagicLink
	emailPasswordSRP?: AuthenticationEmailPasswordSRP
	phonePassword?: AuthenticationPhonePassword
	emailPassword?: AuthenticationEmailPassword
	google?: AuthenticationGoogle
	github?: AuthenticationGithub
}

export type AuthenticationEmailPasswordSRP = {
	email: string
	salt: string
	verifier: string
	serverSecret?: string
	serverSecretExpiresAt?: Date
}

export type AuthenticationPhonePassword = {
	phone: string
	password: string
}

export type AuthenticationEmailPassword = {
	email: string
	password: string
}

export type AuthenticationGoogle = {
	providerUserId?: string
	email: string
	verifiedEmail: boolean
}

export type AuthenticationGithub = {
	providerUserId?: string
	email: string
	avatarUrl: string
	username: string
}

export type SecondFA = {
	enabled: boolean
	provider: SecondaryFactor
}

export type PendingAuthenticationChallenge = {
	token: string
	provider: string
	expiresAt: Date
}

export type User = {
	id: string
	authentication?: Authentication
	provider?: AuthenticationProvider
	isOauth?: boolean
	email?: string
	verifiedEmail?: boolean
	role?: Role
	sessions?: Array<_Session>
	secondFA?: SecondFA
	otpSalt?: string
	pendingChallenges?: Array<PendingAuthenticationChallenge>
	acl?: ACLObject
	createdAt?: string
	updatedAt?: string
	search?: Array<string>
}

export type _Session = {
	id: string
	user: User
	accessTokenEncrypted: string
	accessTokenExpiresAt: string
	refreshTokenEncrypted: string
	refreshTokenExpiresAt: string
	acl?: ACLObject
	createdAt?: string
	updatedAt?: string
	search?: Array<string>
}

export type Role = {
	id: string
	name: string
	users?: Array<User>
	acl?: ACLObject
	createdAt?: string
	updatedAt?: string
	search?: Array<string>
}

export type _InternalConfig = {
	id: string
	configKey: string
	configValue: string
	description?: string
	acl?: ACLObject
	createdAt?: string
	updatedAt?: string
	search?: Array<string>
}

export type _MagicLinkChallenge = {
	id: string
	email: string
	token: string
	otpHash: string
	expiresAt: string
	intent: MagicLinkIntent
	attempts: number
	acl?: ACLObject
	createdAt?: string
	updatedAt?: string
	search?: Array<string>
}

export type _Mutex = {
	id: string
	name: string
	locked: boolean
	acl?: ACLObject
	createdAt?: string
	updatedAt?: string
	search?: Array<string>
}

export type WhereCollection1 = {
	id: string
	name?: string
	acl?: ACLObject
	createdAt?: Date
	updatedAt?: Date
	search?: Array<string>
}

export type WhereUser = {
	id: string
	authentication?: Authentication
	provider?: AuthenticationProvider
	isOauth?: boolean
	email?: string
	verifiedEmail?: boolean
	role?: Role
	sessions?: Array<_Session>
	secondFA?: SecondFA
	otpSalt?: string
	pendingChallenges?: Array<PendingAuthenticationChallenge>
	acl?: ACLObject
	createdAt?: Date
	updatedAt?: Date
	search?: Array<string>
}

export type Where_Session = {
	id: string
	user: User
	accessTokenEncrypted: string
	accessTokenExpiresAt: Date
	refreshTokenEncrypted: string
	refreshTokenExpiresAt: Date
	acl?: ACLObject
	createdAt?: Date
	updatedAt?: Date
	search?: Array<string>
}

export type WhereRole = {
	id: string
	name: string
	users?: Array<User>
	acl?: ACLObject
	createdAt?: Date
	updatedAt?: Date
	search?: Array<string>
}

export type Where_InternalConfig = {
	id: string
	configKey: string
	configValue: string
	description?: string
	acl?: ACLObject
	createdAt?: Date
	updatedAt?: Date
	search?: Array<string>
}

export type Where_MagicLinkChallenge = {
	id: string
	email: string
	token: string
	otpHash: string
	expiresAt: Date
	intent: MagicLinkIntent
	attempts: number
	acl?: ACLObject
	createdAt?: Date
	updatedAt?: Date
	search?: Array<string>
}

export type Where_Mutex = {
	id: string
	name: string
	locked: boolean
	acl?: ACLObject
	createdAt?: Date
	updatedAt?: Date
	search?: Array<string>
}

export type ResetPasswordInput = {
	password: string
	email?: string
	phone?: string
	otp: string
}

export type MutationResetPasswordArgs = {
	input: ResetPasswordInput
}

export type SendOtpCodeInput = {
	email: string
}

export type MutationSendOtpCodeArgs = {
	input: SendOtpCodeInput
}

export type SignInWithInput = {
	authentication: SignInWithAuthentication
}

export type MutationSignInWithArgs = {
	input: SignInWithInput
}

export type SignInWithAuthenticationMagicLink = {
	email: string
}

export type SignInWithAuthentication = {
	magicLink?: SignInWithAuthenticationMagicLink
	emailPasswordSRP?: SignInWithAuthenticationEmailPasswordSRP
	phonePassword?: SignInWithAuthenticationPhonePassword
	emailPassword?: SignInWithAuthenticationEmailPassword
	google?: SignInWithAuthenticationGoogle
	github?: SignInWithAuthenticationGithub
}

export type SignInWithAuthenticationEmailPasswordSRP = {
	email: string
	clientPublic: string
	salt?: string
	verifier?: string
}

export type SignInWithAuthenticationPhonePassword = {
	phone: string
	password: string
}

export type SignInWithAuthenticationEmailPassword = {
	email: string
	password: string
}

export type SignInWithAuthenticationGoogle = {
	authorizationCode: string
	codeVerifier: string
}

export type SignInWithAuthenticationGithub = {
	authorizationCode: string
	codeVerifier: string
}

export type SignUpWithInput = {
	authentication: SignUpWithAuthentication
}

export type MutationSignUpWithArgs = {
	input: SignUpWithInput
}

export type SignUpWithAuthenticationMagicLink = {
	email: string
}

export type SignUpWithAuthentication = {
	magicLink?: SignUpWithAuthenticationMagicLink
	emailPasswordSRP?: SignUpWithAuthenticationEmailPasswordSRP
	phonePassword?: SignUpWithAuthenticationPhonePassword
	emailPassword?: SignUpWithAuthenticationEmailPassword
	google?: SignUpWithAuthenticationGoogle
	github?: SignUpWithAuthenticationGithub
}

export type SignUpWithAuthenticationEmailPasswordSRP = {
	email: string
	clientPublic: string
	salt?: string
	verifier?: string
}

export type SignUpWithAuthenticationPhonePassword = {
	phone: string
	password: string
}

export type SignUpWithAuthenticationEmailPassword = {
	email: string
	password: string
}

export type SignUpWithAuthenticationGoogle = {
	authorizationCode: string
	codeVerifier: string
}

export type SignUpWithAuthenticationGithub = {
	authorizationCode: string
	codeVerifier: string
}

export type SignOutInput = {}

export type MutationSignOutArgs = {
	input: SignOutInput
}

export type RefreshInput = {
	accessToken: string
	refreshToken: string
}

export type MutationRefreshArgs = {
	input: RefreshInput
}

export type VerifyChallengeInput = {
	challengeToken: string
	secondFA?: VerifyChallengeSecondFA
}

export type MutationVerifyChallengeArgs = {
	input: VerifyChallengeInput
}

export type VerifyChallengeSecondFAMagicLinkChallenge = {
	email: string
	otp: string
}

export type VerifyChallengeSecondFA = {
	magicLinkChallenge?: VerifyChallengeSecondFAMagicLinkChallenge
	emailPasswordSRPChallenge?: VerifyChallengeSecondFAEmailPasswordSRPChallenge
	emailOTP?: VerifyChallengeSecondFAEmailOTP
	qrCodeOTP?: VerifyChallengeSecondFAQrCodeOTP
}

export type VerifyChallengeSecondFAEmailPasswordSRPChallenge = {
	email: string
	clientPublic: string
	clientSessionProof: string
}

export type VerifyChallengeSecondFAEmailOTP = {
	email: string
	otp: string
}

export type VerifyChallengeSecondFAQrCodeOTP = {
	email: string
	otp: string
}

export type QueryMeArgs = {}

export type WabeSchemaScalars = ''

export type WabeSchemaEnums = {
	RoleEnum: RoleEnum
	AuthenticationProvider: AuthenticationProvider
	SecondaryFactor: SecondaryFactor
	MagicLinkIntent: MagicLinkIntent
}

export type WabeSchemaTypes = {
	Collection1: Collection1
	User: User
	_Session: _Session
	Role: Role
	_InternalConfig: _InternalConfig
	_MagicLinkChallenge: _MagicLinkChallenge
	_Mutex: _Mutex
}

export type WabeSchemaWhereTypes = {
	Collection1: WhereCollection1
	User: WhereUser
	_Session: Where_Session
	Role: WhereRole
	_InternalConfig: Where_InternalConfig
	_MagicLinkChallenge: Where_MagicLinkChallenge
	_Mutex: Where_Mutex
}
