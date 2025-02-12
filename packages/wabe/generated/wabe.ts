export enum RoleEnum {
	Admin = "Admin",
	Client = "Client"
}

export enum AuthenticationProvider {
	github = "github",
	google = "google",
	emailPassword = "emailPassword",
	phonePassword = "phonePassword"
}

export enum SecondaryFactor {
	EmailOTP = "emailOTP"
}

export type ACLObjectUsersACL = {
	userId: string,
	read: boolean,
	write: boolean
}

export type ACLObject = {
	users?: Array<ACLObjectUsersACL>,
	roles?: Array<ACLObjectRolesACL>
}

export type ACLObjectRolesACL = {
	roleId: string,
	read: boolean,
	write: boolean
}

export type AuthenticationPhonePassword = {
	phone: string,
	password: string
}

export type Authentication = {
	phonePassword?: AuthenticationPhonePassword,
	emailPassword?: AuthenticationEmailPassword,
	google?: AuthenticationGoogle,
	github?: AuthenticationGithub
}

export type AuthenticationEmailPassword = {
	email: string,
	password: string
}

export type AuthenticationGoogle = {
	email: string,
	verifiedEmail: boolean
}

export type AuthenticationGithub = {
	email: string,
	avatarUrl: string,
	username: string
}

export type User = {
	id: string,
	name?: string,
	age?: number,
	email?: string,
	acl?: ACLObject,
	createdAt?: Date,
	updatedAt?: Date,
	search?: Array<string>,
	authentication?: Authentication,
	provider?: AuthenticationProvider,
	isOauth?: boolean,
	verifiedEmail?: boolean,
	role?: Role,
	sessions?: Array<string>
}

export type Post = {
	id: string,
	name: string,
	test2?: RoleEnum,
	acl?: ACLObject,
	createdAt?: Date,
	updatedAt?: Date,
	search?: Array<string>
}

export type _Session = {
	id: string,
	user: User,
	accessToken: string,
	accessTokenExpiresAt: Date,
	refreshToken?: string,
	refreshTokenExpiresAt: Date,
	acl?: ACLObject,
	createdAt?: Date,
	updatedAt?: Date,
	search?: Array<string>
}

export type Role = {
	id: string,
	name: string,
	users?: Array<string>,
	acl?: ACLObject,
	createdAt?: Date,
	updatedAt?: Date,
	search?: Array<string>
}

export type _InternalConfig = {
	id: string,
	configKey: string,
	configValue: string,
	description?: string,
	acl?: ACLObject,
	createdAt?: Date,
	updatedAt?: Date,
	search?: Array<string>
}

export type CreateMutationInput = {
	name: number
}

export type MutationCreateMutationArgs = {
	input: CreateMutationInput
}

export type CustomMutationInput = {
	a: number,
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
	a: number,
	b: number
}

export type ResetPasswordInput = {
	password: string,
	email: string,
	otp: string,
	provider: AuthenticationProvider
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
	from: string,
	to: Array<string>,
	subject: string,
	text?: string,
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

export type SignInWithAuthenticationPhonePassword = {
	phone: string,
	password: string
}

export type SignInWithAuthentication = {
	phonePassword?: SignInWithAuthenticationPhonePassword,
	emailPassword?: SignInWithAuthenticationEmailPassword,
	google?: SignInWithAuthenticationGoogle,
	github?: SignInWithAuthenticationGithub,
	otp?: SignInWithAuthenticationOtp,
	secondaryFactor?: SecondaryFactor
}

export type SignInWithAuthenticationEmailPassword = {
	email: string,
	password: string
}

export type SignInWithAuthenticationGoogle = {
	authorizationCode: string,
	codeVerifier: string
}

export type SignInWithAuthenticationGithub = {
	authorizationCode: string,
	codeVerifier: string
}

export type SignInWithAuthenticationOtp = {
	code?: string
}

export type SignUpWithInput = {
	authentication: SignUpWithAuthentication
}

export type MutationSignUpWithArgs = {
	input: SignUpWithInput
}

export type SignUpWithAuthenticationPhonePassword = {
	phone: string,
	password: string
}

export type SignUpWithAuthentication = {
	phonePassword?: SignUpWithAuthenticationPhonePassword,
	emailPassword?: SignUpWithAuthenticationEmailPassword,
	google?: SignUpWithAuthenticationGoogle,
	github?: SignUpWithAuthenticationGithub,
	otp?: SignUpWithAuthenticationOtp,
	secondaryFactor?: SecondaryFactor
}

export type SignUpWithAuthenticationEmailPassword = {
	email: string,
	password: string
}

export type SignUpWithAuthenticationGoogle = {
	authorizationCode: string,
	codeVerifier: string
}

export type SignUpWithAuthenticationGithub = {
	authorizationCode: string,
	codeVerifier: string
}

export type SignUpWithAuthenticationOtp = {
	code?: string
}

export type SignOutInput = {

}

export type MutationSignOutArgs = {
	input: SignOutInput
}

export type RefreshInput = {
	accessToken: string,
	refreshToken: string
}

export type MutationRefreshArgs = {
	input: RefreshInput
}

export type VerifyChallengeInput = {
	factor?: VerifyChallengeFactor
}

export type MutationVerifyChallengeArgs = {
	input: VerifyChallengeInput
}

export type VerifyChallengeFactorOtp = {
	code?: string
}

export type VerifyChallengeFactor = {
	otp?: VerifyChallengeFactorOtp
}

export type QueryHelloWorldArgs = {
	name: string
}

export type QueryMeArgs = {

}

export type WabeSchemaScalars = ""

export type WabeSchemaEnums = {
	RoleEnum: RoleEnum,
	AuthenticationProvider: AuthenticationProvider,
	SecondaryFactor: SecondaryFactor
}

export type WabeSchemaTypes = {
	User: User,
	Post: Post,
	_Session: _Session,
	Role: Role,
	_InternalConfig: _InternalConfig
}