export enum RoleEnum {
	DashboardAdmin = 'DashboardAdmin',
	Admin = 'Admin',
	Client = 'Client',
}

export enum AuthenticationProvider {
	github = 'github',
	google = 'google',
	emailPassword = 'emailPassword',
	phonePassword = 'phonePassword',
}

export enum SecondaryFactor {
	emailOTP = 'emailOTP',
	qrcodeOTP = 'qrcodeOTP',
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

export type AuthenticationEmailPasswordSRP = {
	email: string
	salt: string
	verifier: string
	serverSecret?: string
}

export type Authentication = {
	emailPasswordSRP?: AuthenticationEmailPasswordSRP
	phonePassword?: AuthenticationPhonePassword
	emailPassword?: AuthenticationEmailPassword
	google?: AuthenticationGoogle
	github?: AuthenticationGithub
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
	email: string
	verifiedEmail: boolean
}

export type AuthenticationGithub = {
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
	name?: string
	age?: number
	email?: string
	acl?: ACLObject
	createdAt?: string
	updatedAt?: string
	search?: Array<string>
	authentication?: Authentication
	provider?: AuthenticationProvider
	isOauth?: boolean
	verifiedEmail?: boolean
	role?: Role
	sessions?: Array<_Session>
	secondFA?: SecondFA
	pendingChallenges?: Array<PendingAuthenticationChallenge>
}

export type Experience = {
	jobTitle: string
	companyName: string
	startDate: string
	endDate: string
	achievements?: Array<string>
}

export type Post = {
	id: string
	name: string
	test2?: RoleEnum
	test3: Array<User>
	test4: User
	experiences?: Array<Experience>
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

export type WhereUser = {
	id: string
	name?: string
	age?: number
	email?: string
	acl?: ACLObject
	createdAt?: Date
	updatedAt?: Date
	search?: Array<string>
	authentication?: Authentication
	provider?: AuthenticationProvider
	isOauth?: boolean
	verifiedEmail?: boolean
	role?: Role
	sessions?: Array<_Session>
	secondFA?: SecondFA
	pendingChallenges?: Array<PendingAuthenticationChallenge>
}

export type WherePost = {
	id: string
	name: string
	test2?: RoleEnum
	test3: Array<User>
	test4: User
	experiences?: Array<Experience>
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

export type CreateMutationInput = {
	name: number
}

export type MutationCreateMutationArgs = {
	input: CreateMutationInput
}

export type CustomMutationInput = {
	a: number
	b: number
}

export type MutationCustomMutationArgs = {
	input: CustomMutationInput
}

export type SecondCustomMutationInput = {
	sum?: SecondCustomMutationSum
}

export type MutationSecondCustomMutationArgs = {
	input: SecondCustomMutationInput
}

export type SecondCustomMutationSum = {
	a: number
	b: number
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

export type SendEmailInput = {
	from: string
	to: Array<string>
	subject: string
	text?: string
	html?: string
}

export type MutationSendEmailArgs = {
	input: SendEmailInput
}

export type SignInWithInput = {
	authentication: SignInWithAuthentication
}

export type MutationSignInWithArgs = {
	input: SignInWithInput
}

export type SignInWithAuthenticationEmailPasswordSRP = {
	email: string
	clientPublic?: string
	salt?: string
	verifier?: string
}

export type SignInWithAuthentication = {
	emailPasswordSRP?: SignInWithAuthenticationEmailPasswordSRP
	phonePassword?: SignInWithAuthenticationPhonePassword
	emailPassword?: SignInWithAuthenticationEmailPassword
	google?: SignInWithAuthenticationGoogle
	github?: SignInWithAuthenticationGithub
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

export type SignUpWithAuthenticationEmailPasswordSRP = {
	email: string
	clientPublic?: string
	salt?: string
	verifier?: string
}

export type SignUpWithAuthentication = {
	emailPasswordSRP?: SignUpWithAuthenticationEmailPasswordSRP
	phonePassword?: SignUpWithAuthenticationPhonePassword
	emailPassword?: SignUpWithAuthenticationEmailPassword
	google?: SignUpWithAuthenticationGoogle
	github?: SignUpWithAuthenticationGithub
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
	challengeToken?: string
	secondFA?: VerifyChallengeSecondFA
}

export type MutationVerifyChallengeArgs = {
	input: VerifyChallengeInput
}

export type VerifyChallengeSecondFAEmailPasswordSRPChallenge = {
	email: string
	clientPublic: string
	clientSessionProof: string
}

export type VerifyChallengeSecondFA = {
	emailPasswordSRPChallenge?: VerifyChallengeSecondFAEmailPasswordSRPChallenge
	emailOTP?: VerifyChallengeSecondFAEmailOTP
	qrCodeOTP?: VerifyChallengeSecondFAQrCodeOTP
}

export type VerifyChallengeSecondFAEmailOTP = {
	email: string
	otp: string
}

export type VerifyChallengeSecondFAQrCodeOTP = {
	email: string
	otp: string
}

export type QueryHelloWorldArgs = {
	name: string
}

export type QueryMeArgs = {}

export type WabeSchemaScalars = ''

export type WabeSchemaEnums = {
	RoleEnum: RoleEnum
	AuthenticationProvider: AuthenticationProvider
	SecondaryFactor: SecondaryFactor
}

export type WabeSchemaTypes = {
	User: User
	Post: Post
	_Session: _Session
	Role: Role
	_InternalConfig: _InternalConfig
}

export type WabeSchemaWhereTypes = {
	User: WhereUser
	Post: WherePost
	_Session: Where_Session
	Role: WhereRole
	_InternalConfig: Where_InternalConfig
}
