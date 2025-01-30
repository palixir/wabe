export type Scalars = {
  ID: { input: string; output: string; };
  String: { input: string; output: string; };
  Boolean: { input: boolean; output: boolean; };
  Int: { input: number; output: number; };
  Float: { input: number; output: number; };
  Email: { input: string; output: string; };
  Phone: { input: string; output: string; };
  Date: { input: Date; output: string; };
  Search: { input: any; output: any; };
  Any: { input: any; output: any; };
  File: { input: any; output: any; };
};


export enum RoleEnum {
  Admin = "Admin",
  Client = "Client",
}

export enum AuthenticationProvider {
  github = "github",
  google = "google",
  emailPassword = "emailPassword",
  phonePassword = "phonePassword",
}

export enum SecondaryFactor {
  EmailOTP = "EmailOTP",
}

export type FileInfo = {
  name: Scalars['String']['output'];
  url?: Scalars['String']['output'];
  urlGeneratedAt?: Scalars['Date']['output'];
};

export type User = {
  id: Scalars['ID']['output'];
  name?: Scalars['String']['output'];
  age?: Scalars['Int']['output'];
  email?: Scalars['Email']['output'];
  tata?: FileInfo;
  acl?: UserACLObject;
  createdAt?: Scalars['Date']['output'];
  updatedAt?: Scalars['Date']['output'];
  search?: Scalars['String']['output'][];
  authentication?: UserAuthentication;
  provider?: AuthenticationProvider;
  isOauth?: Scalars['Boolean']['output'];
  verifiedEmail?: Scalars['Boolean']['output'];
  role?: Role;
  sessions?: _SessionConnection;
};

export type UserACLObject = {
  users?: UserACLObjectUsersACL[];
  roles?: UserACLObjectRolesACL[];
};

export type UserACLObjectUsersACL = {
  userId: Scalars['String']['output'];
  read: Scalars['Boolean']['output'];
  write: Scalars['Boolean']['output'];
};

export type UserACLObjectRolesACL = {
  roleId: Scalars['String']['output'];
  read: Scalars['Boolean']['output'];
  write: Scalars['Boolean']['output'];
};

export type UserAuthentication = {
  phonePassword?: UserAuthenticationPhonePassword;
  emailPassword?: UserAuthenticationEmailPassword;
  google?: UserAuthenticationGoogle;
  github?: UserAuthenticationGithub;
};

export type UserAuthenticationPhonePassword = {
  phone: Scalars['Phone']['output'];
  password: Scalars['String']['output'];
};

export type UserAuthenticationEmailPassword = {
  email: Scalars['Email']['output'];
  password: Scalars['String']['output'];
};

export type UserAuthenticationGoogle = {
  email: Scalars['Email']['output'];
  verifiedEmail: Scalars['Boolean']['output'];
};

export type UserAuthenticationGithub = {
  email: Scalars['Email']['output'];
  avatarUrl: Scalars['String']['output'];
  username: Scalars['String']['output'];
};

export type _SessionConnection = {
  totalCount?: Scalars['Int']['output'];
  edges?: _SessionEdge[];
};

export type _SessionEdge = {
  node: _Session;
};

export type UserInput = {
  name?: Scalars['String']['input'];
  age?: Scalars['Int']['input'];
  email?: Scalars['Email']['input'];
  tata?: Scalars['File']['input'];
  acl?: UserACLObjectInput;
  createdAt?: Scalars['Date']['input'];
  updatedAt?: Scalars['Date']['input'];
  search?: Scalars['String']['input'][];
  authentication?: UserAuthenticationInput;
  provider?: AuthenticationProvider;
  isOauth?: Scalars['Boolean']['input'];
  verifiedEmail?: Scalars['Boolean']['input'];
  role?: RolePointerInput;
  sessions?: _SessionRelationInput;
};

export type UserACLObjectInput = {
  users?: UserACLObjectUsersACLInput[];
  roles?: UserACLObjectRolesACLInput[];
};

export type UserACLObjectUsersACLInput = {
  userId: Scalars['String']['input'];
  read: Scalars['Boolean']['input'];
  write: Scalars['Boolean']['input'];
};

export type UserACLObjectRolesACLInput = {
  roleId: Scalars['String']['input'];
  read: Scalars['Boolean']['input'];
  write: Scalars['Boolean']['input'];
};

export type UserAuthenticationInput = {
  phonePassword?: UserAuthenticationPhonePasswordInput;
  emailPassword?: UserAuthenticationEmailPasswordInput;
  google?: UserAuthenticationGoogleInput;
  github?: UserAuthenticationGithubInput;
};

export type UserAuthenticationPhonePasswordInput = {
  phone: Scalars['Phone']['input'];
  password: Scalars['String']['input'];
};

export type UserAuthenticationEmailPasswordInput = {
  email: Scalars['Email']['input'];
  password: Scalars['String']['input'];
};

export type UserAuthenticationGoogleInput = {
  email: Scalars['Email']['input'];
  verifiedEmail: Scalars['Boolean']['input'];
};

export type UserAuthenticationGithubInput = {
  email: Scalars['Email']['input'];
  avatarUrl: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

export type UserPointerInput = {
  unlink?: Scalars['Boolean']['input'];
  link?: Scalars['ID']['input'];
  createAndLink?: UserCreateFieldsInput;
};

export type UserCreateFieldsInput = {
  name?: Scalars['String']['input'];
  age?: Scalars['Int']['input'];
  email?: Scalars['Email']['input'];
  tata?: Scalars['File']['input'];
  acl?: UserACLObjectCreateFieldsInput;
  createdAt?: Scalars['Date']['input'];
  updatedAt?: Scalars['Date']['input'];
  search?: Scalars['String']['input'][];
  authentication?: UserAuthenticationCreateFieldsInput;
  provider?: AuthenticationProvider;
  isOauth?: Scalars['Boolean']['input'];
  verifiedEmail?: Scalars['Boolean']['input'];
  role?: RolePointerInput;
  sessions?: _SessionRelationInput;
};

export type UserACLObjectCreateFieldsInput = {
  users?: UserACLObjectUsersACLCreateFieldsInput[];
  roles?: UserACLObjectRolesACLCreateFieldsInput[];
};

export type UserACLObjectUsersACLCreateFieldsInput = {
  userId?: Scalars['String']['input'];
  read?: Scalars['Boolean']['input'];
  write?: Scalars['Boolean']['input'];
};

export type UserACLObjectRolesACLCreateFieldsInput = {
  roleId?: Scalars['String']['input'];
  read?: Scalars['Boolean']['input'];
  write?: Scalars['Boolean']['input'];
};

export type UserAuthenticationCreateFieldsInput = {
  phonePassword?: UserAuthenticationPhonePasswordCreateFieldsInput;
  emailPassword?: UserAuthenticationEmailPasswordCreateFieldsInput;
  google?: UserAuthenticationGoogleCreateFieldsInput;
  github?: UserAuthenticationGithubCreateFieldsInput;
};

export type UserAuthenticationPhonePasswordCreateFieldsInput = {
  phone?: Scalars['Phone']['input'];
  password?: Scalars['String']['input'];
};

export type UserAuthenticationEmailPasswordCreateFieldsInput = {
  email?: Scalars['Email']['input'];
  password?: Scalars['String']['input'];
};

export type UserAuthenticationGoogleCreateFieldsInput = {
  email?: Scalars['Email']['input'];
  verifiedEmail?: Scalars['Boolean']['input'];
};

export type UserAuthenticationGithubCreateFieldsInput = {
  email?: Scalars['Email']['input'];
  avatarUrl?: Scalars['String']['input'];
  username?: Scalars['String']['input'];
};

export type UserRelationInput = {
  add?: Scalars['ID']['input'][];
  remove?: Scalars['ID']['input'][];
  createAndAdd?: UserCreateFieldsInput[];
};

export type Post = {
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  test2?: RoleEnum;
  acl?: PostACLObject;
  createdAt?: Scalars['Date']['output'];
  updatedAt?: Scalars['Date']['output'];
  search?: Scalars['String']['output'][];
};

export type PostACLObject = {
  users?: PostACLObjectUsersACL[];
  roles?: PostACLObjectRolesACL[];
};

export type PostACLObjectUsersACL = {
  userId: Scalars['String']['output'];
  read: Scalars['Boolean']['output'];
  write: Scalars['Boolean']['output'];
};

export type PostACLObjectRolesACL = {
  roleId: Scalars['String']['output'];
  read: Scalars['Boolean']['output'];
  write: Scalars['Boolean']['output'];
};

export type PostInput = {
  name: Scalars['String']['input'];
  test2?: RoleEnum;
  acl?: PostACLObjectInput;
  createdAt?: Scalars['Date']['input'];
  updatedAt?: Scalars['Date']['input'];
  search?: Scalars['String']['input'][];
};

export type PostACLObjectInput = {
  users?: PostACLObjectUsersACLInput[];
  roles?: PostACLObjectRolesACLInput[];
};

export type PostACLObjectUsersACLInput = {
  userId: Scalars['String']['input'];
  read: Scalars['Boolean']['input'];
  write: Scalars['Boolean']['input'];
};

export type PostACLObjectRolesACLInput = {
  roleId: Scalars['String']['input'];
  read: Scalars['Boolean']['input'];
  write: Scalars['Boolean']['input'];
};

export type PostPointerInput = {
  unlink?: Scalars['Boolean']['input'];
  link?: Scalars['ID']['input'];
  createAndLink?: PostCreateFieldsInput;
};

export type PostCreateFieldsInput = {
  name?: Scalars['String']['input'];
  test2?: RoleEnum;
  acl?: PostACLObjectCreateFieldsInput;
  createdAt?: Scalars['Date']['input'];
  updatedAt?: Scalars['Date']['input'];
  search?: Scalars['String']['input'][];
};

export type PostACLObjectCreateFieldsInput = {
  users?: PostACLObjectUsersACLCreateFieldsInput[];
  roles?: PostACLObjectRolesACLCreateFieldsInput[];
};

export type PostACLObjectUsersACLCreateFieldsInput = {
  userId?: Scalars['String']['input'];
  read?: Scalars['Boolean']['input'];
  write?: Scalars['Boolean']['input'];
};

export type PostACLObjectRolesACLCreateFieldsInput = {
  roleId?: Scalars['String']['input'];
  read?: Scalars['Boolean']['input'];
  write?: Scalars['Boolean']['input'];
};

export type PostRelationInput = {
  add?: Scalars['ID']['input'][];
  remove?: Scalars['ID']['input'][];
  createAndAdd?: PostCreateFieldsInput[];
};

export type _Session = {
  id: Scalars['ID']['output'];
  user?: User;
  accessToken: Scalars['String']['output'];
  accessTokenExpiresAt: Scalars['Date']['output'];
  refreshToken?: Scalars['String']['output'];
  refreshTokenExpiresAt: Scalars['Date']['output'];
  acl?: _SessionACLObject;
  createdAt?: Scalars['Date']['output'];
  updatedAt?: Scalars['Date']['output'];
  search?: Scalars['String']['output'][];
};

export type _SessionACLObject = {
  users?: _SessionACLObjectUsersACL[];
  roles?: _SessionACLObjectRolesACL[];
};

export type _SessionACLObjectUsersACL = {
  userId: Scalars['String']['output'];
  read: Scalars['Boolean']['output'];
  write: Scalars['Boolean']['output'];
};

export type _SessionACLObjectRolesACL = {
  roleId: Scalars['String']['output'];
  read: Scalars['Boolean']['output'];
  write: Scalars['Boolean']['output'];
};

export type _SessionInput = {
  user?: UserPointerInput;
  accessToken: Scalars['String']['input'];
  accessTokenExpiresAt: Scalars['Date']['input'];
  refreshToken?: Scalars['String']['input'];
  refreshTokenExpiresAt: Scalars['Date']['input'];
  acl?: _SessionACLObjectInput;
  createdAt?: Scalars['Date']['input'];
  updatedAt?: Scalars['Date']['input'];
  search?: Scalars['String']['input'][];
};

export type _SessionACLObjectInput = {
  users?: _SessionACLObjectUsersACLInput[];
  roles?: _SessionACLObjectRolesACLInput[];
};

export type _SessionACLObjectUsersACLInput = {
  userId: Scalars['String']['input'];
  read: Scalars['Boolean']['input'];
  write: Scalars['Boolean']['input'];
};

export type _SessionACLObjectRolesACLInput = {
  roleId: Scalars['String']['input'];
  read: Scalars['Boolean']['input'];
  write: Scalars['Boolean']['input'];
};

export type _SessionPointerInput = {
  unlink?: Scalars['Boolean']['input'];
  link?: Scalars['ID']['input'];
  createAndLink?: _SessionCreateFieldsInput;
};

export type _SessionCreateFieldsInput = {
  user?: UserPointerInput;
  accessToken?: Scalars['String']['input'];
  accessTokenExpiresAt?: Scalars['Date']['input'];
  refreshToken?: Scalars['String']['input'];
  refreshTokenExpiresAt?: Scalars['Date']['input'];
  acl?: _SessionACLObjectCreateFieldsInput;
  createdAt?: Scalars['Date']['input'];
  updatedAt?: Scalars['Date']['input'];
  search?: Scalars['String']['input'][];
};

export type _SessionACLObjectCreateFieldsInput = {
  users?: _SessionACLObjectUsersACLCreateFieldsInput[];
  roles?: _SessionACLObjectRolesACLCreateFieldsInput[];
};

export type _SessionACLObjectUsersACLCreateFieldsInput = {
  userId?: Scalars['String']['input'];
  read?: Scalars['Boolean']['input'];
  write?: Scalars['Boolean']['input'];
};

export type _SessionACLObjectRolesACLCreateFieldsInput = {
  roleId?: Scalars['String']['input'];
  read?: Scalars['Boolean']['input'];
  write?: Scalars['Boolean']['input'];
};

export type _SessionRelationInput = {
  add?: Scalars['ID']['input'][];
  remove?: Scalars['ID']['input'][];
  createAndAdd?: _SessionCreateFieldsInput[];
};

export type Role = {
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  users?: UserConnection;
  acl?: RoleACLObject;
  createdAt?: Scalars['Date']['output'];
  updatedAt?: Scalars['Date']['output'];
  search?: Scalars['String']['output'][];
};

export type UserConnection = {
  totalCount?: Scalars['Int']['output'];
  edges?: UserEdge[];
};

export type UserEdge = {
  node: User;
};

export type RoleACLObject = {
  users?: RoleACLObjectUsersACL[];
  roles?: RoleACLObjectRolesACL[];
};

export type RoleACLObjectUsersACL = {
  userId: Scalars['String']['output'];
  read: Scalars['Boolean']['output'];
  write: Scalars['Boolean']['output'];
};

export type RoleACLObjectRolesACL = {
  roleId: Scalars['String']['output'];
  read: Scalars['Boolean']['output'];
  write: Scalars['Boolean']['output'];
};

export type RoleInput = {
  name: Scalars['String']['input'];
  users?: UserRelationInput;
  acl?: RoleACLObjectInput;
  createdAt?: Scalars['Date']['input'];
  updatedAt?: Scalars['Date']['input'];
  search?: Scalars['String']['input'][];
};

export type RoleACLObjectInput = {
  users?: RoleACLObjectUsersACLInput[];
  roles?: RoleACLObjectRolesACLInput[];
};

export type RoleACLObjectUsersACLInput = {
  userId: Scalars['String']['input'];
  read: Scalars['Boolean']['input'];
  write: Scalars['Boolean']['input'];
};

export type RoleACLObjectRolesACLInput = {
  roleId: Scalars['String']['input'];
  read: Scalars['Boolean']['input'];
  write: Scalars['Boolean']['input'];
};

export type RolePointerInput = {
  unlink?: Scalars['Boolean']['input'];
  link?: Scalars['ID']['input'];
  createAndLink?: RoleCreateFieldsInput;
};

export type RoleCreateFieldsInput = {
  name?: Scalars['String']['input'];
  users?: UserRelationInput;
  acl?: RoleACLObjectCreateFieldsInput;
  createdAt?: Scalars['Date']['input'];
  updatedAt?: Scalars['Date']['input'];
  search?: Scalars['String']['input'][];
};

export type RoleACLObjectCreateFieldsInput = {
  users?: RoleACLObjectUsersACLCreateFieldsInput[];
  roles?: RoleACLObjectRolesACLCreateFieldsInput[];
};

export type RoleACLObjectUsersACLCreateFieldsInput = {
  userId?: Scalars['String']['input'];
  read?: Scalars['Boolean']['input'];
  write?: Scalars['Boolean']['input'];
};

export type RoleACLObjectRolesACLCreateFieldsInput = {
  roleId?: Scalars['String']['input'];
  read?: Scalars['Boolean']['input'];
  write?: Scalars['Boolean']['input'];
};

export type RoleRelationInput = {
  add?: Scalars['ID']['input'][];
  remove?: Scalars['ID']['input'][];
  createAndAdd?: RoleCreateFieldsInput[];
};

export type _InternalConfig = {
  id: Scalars['ID']['output'];
  configKey: Scalars['String']['output'];
  configValue: Scalars['String']['output'];
  description?: Scalars['String']['output'];
  acl?: _InternalConfigACLObject;
  createdAt?: Scalars['Date']['output'];
  updatedAt?: Scalars['Date']['output'];
  search?: Scalars['String']['output'][];
};

export type _InternalConfigACLObject = {
  users?: _InternalConfigACLObjectUsersACL[];
  roles?: _InternalConfigACLObjectRolesACL[];
};

export type _InternalConfigACLObjectUsersACL = {
  userId: Scalars['String']['output'];
  read: Scalars['Boolean']['output'];
  write: Scalars['Boolean']['output'];
};

export type _InternalConfigACLObjectRolesACL = {
  roleId: Scalars['String']['output'];
  read: Scalars['Boolean']['output'];
  write: Scalars['Boolean']['output'];
};

export type _InternalConfigInput = {
  configKey: Scalars['String']['input'];
  configValue: Scalars['String']['input'];
  description?: Scalars['String']['input'];
  acl?: _InternalConfigACLObjectInput;
  createdAt?: Scalars['Date']['input'];
  updatedAt?: Scalars['Date']['input'];
  search?: Scalars['String']['input'][];
};

export type _InternalConfigACLObjectInput = {
  users?: _InternalConfigACLObjectUsersACLInput[];
  roles?: _InternalConfigACLObjectRolesACLInput[];
};

export type _InternalConfigACLObjectUsersACLInput = {
  userId: Scalars['String']['input'];
  read: Scalars['Boolean']['input'];
  write: Scalars['Boolean']['input'];
};

export type _InternalConfigACLObjectRolesACLInput = {
  roleId: Scalars['String']['input'];
  read: Scalars['Boolean']['input'];
  write: Scalars['Boolean']['input'];
};

export type _InternalConfigPointerInput = {
  unlink?: Scalars['Boolean']['input'];
  link?: Scalars['ID']['input'];
  createAndLink?: _InternalConfigCreateFieldsInput;
};

export type _InternalConfigCreateFieldsInput = {
  configKey?: Scalars['String']['input'];
  configValue?: Scalars['String']['input'];
  description?: Scalars['String']['input'];
  acl?: _InternalConfigACLObjectCreateFieldsInput;
  createdAt?: Scalars['Date']['input'];
  updatedAt?: Scalars['Date']['input'];
  search?: Scalars['String']['input'][];
};

export type _InternalConfigACLObjectCreateFieldsInput = {
  users?: _InternalConfigACLObjectUsersACLCreateFieldsInput[];
  roles?: _InternalConfigACLObjectRolesACLCreateFieldsInput[];
};

export type _InternalConfigACLObjectUsersACLCreateFieldsInput = {
  userId?: Scalars['String']['input'];
  read?: Scalars['Boolean']['input'];
  write?: Scalars['Boolean']['input'];
};

export type _InternalConfigACLObjectRolesACLCreateFieldsInput = {
  roleId?: Scalars['String']['input'];
  read?: Scalars['Boolean']['input'];
  write?: Scalars['Boolean']['input'];
};

export type _InternalConfigRelationInput = {
  add?: Scalars['ID']['input'][];
  remove?: Scalars['ID']['input'][];
  createAndAdd?: _InternalConfigCreateFieldsInput[];
};

export type Query = {
  user?: User;
  users: UserConnection;
  post?: Post;
  posts: PostConnection;
  _session?: _Session;
  _sessions: _SessionConnection;
  role?: Role;
  roles: RoleConnection;
  _internalConfig?: _InternalConfig;
  _internalConfigs: _InternalConfigConnection;
  helloWorld?: Scalars['String']['output'];
  me?: MeOutput;
};

export type QueryUserArgs = {
  id?: Scalars['ID']['input'];
};

export type QueryUsersArgs = {
  where?: UserWhereInput;
  offset?: Scalars['Int']['input'];
  first?: Scalars['Int']['input'];
  order?: UserOrder[];
};

export type QueryPostArgs = {
  id?: Scalars['ID']['input'];
};

export type QueryPostsArgs = {
  where?: PostWhereInput;
  offset?: Scalars['Int']['input'];
  first?: Scalars['Int']['input'];
  order?: PostOrder[];
};

export type Query_sessionArgs = {
  id?: Scalars['ID']['input'];
};

export type Query_sessionsArgs = {
  where?: _SessionWhereInput;
  offset?: Scalars['Int']['input'];
  first?: Scalars['Int']['input'];
  order?: _SessionOrder[];
};

export type QueryRoleArgs = {
  id?: Scalars['ID']['input'];
};

export type QueryRolesArgs = {
  where?: RoleWhereInput;
  offset?: Scalars['Int']['input'];
  first?: Scalars['Int']['input'];
  order?: RoleOrder[];
};

export type Query_internalConfigArgs = {
  id?: Scalars['ID']['input'];
};

export type Query_internalConfigsArgs = {
  where?: _InternalConfigWhereInput;
  offset?: Scalars['Int']['input'];
  first?: Scalars['Int']['input'];
  order?: _InternalConfigOrder[];
};

export type QueryHelloWorldArgs = {
  name: Scalars['String']['input'];
};

export type UserWhereInput = {
  id?: IdWhereInput;
  name?: StringWhereInput;
  age?: IntWhereInput;
  email?: EmailWhereInput;
  tata?: FileWhereInput;
  acl?: UserACLObjectWhereInput;
  createdAt?: DateWhereInput;
  updatedAt?: DateWhereInput;
  search?: SearchWhereInput;
  authentication?: UserAuthenticationWhereInput;
  provider?: AnyWhereInput;
  isOauth?: BooleanWhereInput;
  verifiedEmail?: BooleanWhereInput;
  role?: RoleWhereInput;
  sessions?: _SessionWhereInput;
  OR?: UserWhereInput[];
  AND?: UserWhereInput[];
};

export type IdWhereInput = {
  equalTo?: Scalars['ID']['input'];
  notEqualTo?: Scalars['ID']['input'];
  in?: Scalars['ID']['input'][];
  notIn?: Scalars['ID']['input'][];
};

export type StringWhereInput = {
  equalTo?: Scalars['String']['input'];
  notEqualTo?: Scalars['String']['input'];
  in?: Scalars['String']['input'][];
  notIn?: Scalars['String']['input'][];
};

export type IntWhereInput = {
  equalTo?: Scalars['Int']['input'];
  notEqualTo?: Scalars['Int']['input'];
  lessThan?: Scalars['Int']['input'];
  lessThanOrEqualTo?: Scalars['Int']['input'];
  greaterThan?: Scalars['Int']['input'];
  greaterThanOrEqualTo?: Scalars['Int']['input'];
  in?: Scalars['Int']['input'][];
  notIn?: Scalars['Int']['input'][];
};

export type EmailWhereInput = {
  equalTo?: Scalars['Email']['input'];
  notEqualTo?: Scalars['Email']['input'];
  in?: Scalars['Email']['input'][];
  notIn?: Scalars['Email']['input'][];
};

export type FileWhereInput = {
  equalTo?: Scalars['File']['input'];
  notEqualTo?: Scalars['File']['input'];
  in?: Scalars['File']['input'][];
  notInt?: Scalars['File']['input'][];
};

export type UserACLObjectWhereInput = {
  users?: UserACLObjectUsersACLWhereInput[];
  roles?: UserACLObjectRolesACLWhereInput[];
  OR?: UserACLObjectWhereInput[];
  AND?: UserACLObjectWhereInput[];
};

export type UserACLObjectUsersACLWhereInput = {
  userId?: StringWhereInput;
  read?: BooleanWhereInput;
  write?: BooleanWhereInput;
  OR?: UserACLObjectUsersACLWhereInput[];
  AND?: UserACLObjectUsersACLWhereInput[];
};

export type BooleanWhereInput = {
  equalTo?: Scalars['Boolean']['input'];
  notEqualTo?: Scalars['Boolean']['input'];
  in?: Scalars['Boolean']['input'][];
  notIn?: Scalars['Boolean']['input'][];
};

export type UserACLObjectRolesACLWhereInput = {
  roleId?: StringWhereInput;
  read?: BooleanWhereInput;
  write?: BooleanWhereInput;
  OR?: UserACLObjectRolesACLWhereInput[];
  AND?: UserACLObjectRolesACLWhereInput[];
};

export type DateWhereInput = {
  equalTo?: Scalars['Date']['input'];
  notEqualTo?: Scalars['Date']['input'];
  in?: Scalars['Date']['input'][];
  notIn?: Scalars['Date']['input'][];
  lessThan?: Scalars['Date']['input'];
  lessThanOrEqualTo?: Scalars['Date']['input'];
  greaterThan?: Scalars['Date']['input'];
  greaterThanOrEqualTo?: Scalars['Date']['input'];
};

export type SearchWhereInput = {
  contains?: Scalars['Search']['input'];
};

export type UserAuthenticationWhereInput = {
  phonePassword?: UserAuthenticationPhonePasswordWhereInput;
  emailPassword?: UserAuthenticationEmailPasswordWhereInput;
  google?: UserAuthenticationGoogleWhereInput;
  github?: UserAuthenticationGithubWhereInput;
  OR?: UserAuthenticationWhereInput[];
  AND?: UserAuthenticationWhereInput[];
};

export type UserAuthenticationPhonePasswordWhereInput = {
  phone?: PhoneWhereInput;
  password?: StringWhereInput;
  OR?: UserAuthenticationPhonePasswordWhereInput[];
  AND?: UserAuthenticationPhonePasswordWhereInput[];
};

export type PhoneWhereInput = {
  equalTo?: Scalars['Phone']['input'];
  notEqualTo?: Scalars['Phone']['input'];
  in?: Scalars['Phone']['input'][];
  notIn?: Scalars['Phone']['input'][];
};

export type UserAuthenticationEmailPasswordWhereInput = {
  email?: EmailWhereInput;
  password?: StringWhereInput;
  OR?: UserAuthenticationEmailPasswordWhereInput[];
  AND?: UserAuthenticationEmailPasswordWhereInput[];
};

export type UserAuthenticationGoogleWhereInput = {
  email?: EmailWhereInput;
  verifiedEmail?: BooleanWhereInput;
  OR?: UserAuthenticationGoogleWhereInput[];
  AND?: UserAuthenticationGoogleWhereInput[];
};

export type UserAuthenticationGithubWhereInput = {
  email?: EmailWhereInput;
  avatarUrl?: StringWhereInput;
  username?: StringWhereInput;
  OR?: UserAuthenticationGithubWhereInput[];
  AND?: UserAuthenticationGithubWhereInput[];
};

export type AnyWhereInput = {
  equalTo?: Scalars['Any']['input'];
  notEqualTo?: Scalars['Any']['input'];
};

export type RoleWhereInput = {
  id?: IdWhereInput;
  name?: StringWhereInput;
  users?: UserWhereInput;
  acl?: RoleACLObjectWhereInput;
  createdAt?: DateWhereInput;
  updatedAt?: DateWhereInput;
  search?: SearchWhereInput;
  OR?: RoleWhereInput[];
  AND?: RoleWhereInput[];
};

export type RoleACLObjectWhereInput = {
  users?: RoleACLObjectUsersACLWhereInput[];
  roles?: RoleACLObjectRolesACLWhereInput[];
  OR?: RoleACLObjectWhereInput[];
  AND?: RoleACLObjectWhereInput[];
};

export type RoleACLObjectUsersACLWhereInput = {
  userId?: StringWhereInput;
  read?: BooleanWhereInput;
  write?: BooleanWhereInput;
  OR?: RoleACLObjectUsersACLWhereInput[];
  AND?: RoleACLObjectUsersACLWhereInput[];
};

export type RoleACLObjectRolesACLWhereInput = {
  roleId?: StringWhereInput;
  read?: BooleanWhereInput;
  write?: BooleanWhereInput;
  OR?: RoleACLObjectRolesACLWhereInput[];
  AND?: RoleACLObjectRolesACLWhereInput[];
};

export type _SessionWhereInput = {
  id?: IdWhereInput;
  user?: UserWhereInput;
  accessToken?: StringWhereInput;
  accessTokenExpiresAt?: DateWhereInput;
  refreshToken?: StringWhereInput;
  refreshTokenExpiresAt?: DateWhereInput;
  acl?: _SessionACLObjectWhereInput;
  createdAt?: DateWhereInput;
  updatedAt?: DateWhereInput;
  search?: SearchWhereInput;
  OR?: _SessionWhereInput[];
  AND?: _SessionWhereInput[];
};

export type _SessionACLObjectWhereInput = {
  users?: _SessionACLObjectUsersACLWhereInput[];
  roles?: _SessionACLObjectRolesACLWhereInput[];
  OR?: _SessionACLObjectWhereInput[];
  AND?: _SessionACLObjectWhereInput[];
};

export type _SessionACLObjectUsersACLWhereInput = {
  userId?: StringWhereInput;
  read?: BooleanWhereInput;
  write?: BooleanWhereInput;
  OR?: _SessionACLObjectUsersACLWhereInput[];
  AND?: _SessionACLObjectUsersACLWhereInput[];
};

export type _SessionACLObjectRolesACLWhereInput = {
  roleId?: StringWhereInput;
  read?: BooleanWhereInput;
  write?: BooleanWhereInput;
  OR?: _SessionACLObjectRolesACLWhereInput[];
  AND?: _SessionACLObjectRolesACLWhereInput[];
};

export enum UserOrder {
  name_ASC = "name_ASC",
  name_DESC = "name_DESC",
  age_ASC = "age_ASC",
  age_DESC = "age_DESC",
  email_ASC = "email_ASC",
  email_DESC = "email_DESC",
  tata_ASC = "tata_ASC",
  tata_DESC = "tata_DESC",
  acl_ASC = "acl_ASC",
  acl_DESC = "acl_DESC",
  createdAt_ASC = "createdAt_ASC",
  createdAt_DESC = "createdAt_DESC",
  updatedAt_ASC = "updatedAt_ASC",
  updatedAt_DESC = "updatedAt_DESC",
  search_ASC = "search_ASC",
  search_DESC = "search_DESC",
  authentication_ASC = "authentication_ASC",
  authentication_DESC = "authentication_DESC",
  provider_ASC = "provider_ASC",
  provider_DESC = "provider_DESC",
  isOauth_ASC = "isOauth_ASC",
  isOauth_DESC = "isOauth_DESC",
  verifiedEmail_ASC = "verifiedEmail_ASC",
  verifiedEmail_DESC = "verifiedEmail_DESC",
  role_ASC = "role_ASC",
  role_DESC = "role_DESC",
  sessions_ASC = "sessions_ASC",
  sessions_DESC = "sessions_DESC",
}

export type PostConnection = {
  totalCount?: Scalars['Int']['output'];
  edges?: PostEdge[];
};

export type PostEdge = {
  node: Post;
};

export type PostWhereInput = {
  id?: IdWhereInput;
  name?: StringWhereInput;
  test2?: AnyWhereInput;
  acl?: PostACLObjectWhereInput;
  createdAt?: DateWhereInput;
  updatedAt?: DateWhereInput;
  search?: SearchWhereInput;
  OR?: PostWhereInput[];
  AND?: PostWhereInput[];
};

export type PostACLObjectWhereInput = {
  users?: PostACLObjectUsersACLWhereInput[];
  roles?: PostACLObjectRolesACLWhereInput[];
  OR?: PostACLObjectWhereInput[];
  AND?: PostACLObjectWhereInput[];
};

export type PostACLObjectUsersACLWhereInput = {
  userId?: StringWhereInput;
  read?: BooleanWhereInput;
  write?: BooleanWhereInput;
  OR?: PostACLObjectUsersACLWhereInput[];
  AND?: PostACLObjectUsersACLWhereInput[];
};

export type PostACLObjectRolesACLWhereInput = {
  roleId?: StringWhereInput;
  read?: BooleanWhereInput;
  write?: BooleanWhereInput;
  OR?: PostACLObjectRolesACLWhereInput[];
  AND?: PostACLObjectRolesACLWhereInput[];
};

export enum PostOrder {
  name_ASC = "name_ASC",
  name_DESC = "name_DESC",
  test2_ASC = "test2_ASC",
  test2_DESC = "test2_DESC",
  acl_ASC = "acl_ASC",
  acl_DESC = "acl_DESC",
  createdAt_ASC = "createdAt_ASC",
  createdAt_DESC = "createdAt_DESC",
  updatedAt_ASC = "updatedAt_ASC",
  updatedAt_DESC = "updatedAt_DESC",
  search_ASC = "search_ASC",
  search_DESC = "search_DESC",
}

export enum _SessionOrder {
  user_ASC = "user_ASC",
  user_DESC = "user_DESC",
  accessToken_ASC = "accessToken_ASC",
  accessToken_DESC = "accessToken_DESC",
  accessTokenExpiresAt_ASC = "accessTokenExpiresAt_ASC",
  accessTokenExpiresAt_DESC = "accessTokenExpiresAt_DESC",
  refreshToken_ASC = "refreshToken_ASC",
  refreshToken_DESC = "refreshToken_DESC",
  refreshTokenExpiresAt_ASC = "refreshTokenExpiresAt_ASC",
  refreshTokenExpiresAt_DESC = "refreshTokenExpiresAt_DESC",
  acl_ASC = "acl_ASC",
  acl_DESC = "acl_DESC",
  createdAt_ASC = "createdAt_ASC",
  createdAt_DESC = "createdAt_DESC",
  updatedAt_ASC = "updatedAt_ASC",
  updatedAt_DESC = "updatedAt_DESC",
  search_ASC = "search_ASC",
  search_DESC = "search_DESC",
}

export type RoleConnection = {
  totalCount?: Scalars['Int']['output'];
  edges?: RoleEdge[];
};

export type RoleEdge = {
  node: Role;
};

export enum RoleOrder {
  name_ASC = "name_ASC",
  name_DESC = "name_DESC",
  users_ASC = "users_ASC",
  users_DESC = "users_DESC",
  acl_ASC = "acl_ASC",
  acl_DESC = "acl_DESC",
  createdAt_ASC = "createdAt_ASC",
  createdAt_DESC = "createdAt_DESC",
  updatedAt_ASC = "updatedAt_ASC",
  updatedAt_DESC = "updatedAt_DESC",
  search_ASC = "search_ASC",
  search_DESC = "search_DESC",
}

export type _InternalConfigConnection = {
  totalCount?: Scalars['Int']['output'];
  edges?: _InternalConfigEdge[];
};

export type _InternalConfigEdge = {
  node: _InternalConfig;
};

export type _InternalConfigWhereInput = {
  id?: IdWhereInput;
  configKey?: StringWhereInput;
  configValue?: StringWhereInput;
  description?: StringWhereInput;
  acl?: _InternalConfigACLObjectWhereInput;
  createdAt?: DateWhereInput;
  updatedAt?: DateWhereInput;
  search?: SearchWhereInput;
  OR?: _InternalConfigWhereInput[];
  AND?: _InternalConfigWhereInput[];
};

export type _InternalConfigACLObjectWhereInput = {
  users?: _InternalConfigACLObjectUsersACLWhereInput[];
  roles?: _InternalConfigACLObjectRolesACLWhereInput[];
  OR?: _InternalConfigACLObjectWhereInput[];
  AND?: _InternalConfigACLObjectWhereInput[];
};

export type _InternalConfigACLObjectUsersACLWhereInput = {
  userId?: StringWhereInput;
  read?: BooleanWhereInput;
  write?: BooleanWhereInput;
  OR?: _InternalConfigACLObjectUsersACLWhereInput[];
  AND?: _InternalConfigACLObjectUsersACLWhereInput[];
};

export type _InternalConfigACLObjectRolesACLWhereInput = {
  roleId?: StringWhereInput;
  read?: BooleanWhereInput;
  write?: BooleanWhereInput;
  OR?: _InternalConfigACLObjectRolesACLWhereInput[];
  AND?: _InternalConfigACLObjectRolesACLWhereInput[];
};

export enum _InternalConfigOrder {
  configKey_ASC = "configKey_ASC",
  configKey_DESC = "configKey_DESC",
  configValue_ASC = "configValue_ASC",
  configValue_DESC = "configValue_DESC",
  description_ASC = "description_ASC",
  description_DESC = "description_DESC",
  acl_ASC = "acl_ASC",
  acl_DESC = "acl_DESC",
  createdAt_ASC = "createdAt_ASC",
  createdAt_DESC = "createdAt_DESC",
  updatedAt_ASC = "updatedAt_ASC",
  updatedAt_DESC = "updatedAt_DESC",
  search_ASC = "search_ASC",
  search_DESC = "search_DESC",
}

export type MeOutput = {
  user?: User;
};

export type Mutation = {
  createUser?: CreateUserPayload;
  createUsers: UserConnection;
  updateUser?: UpdateUserPayload;
  updateUsers: UserConnection;
  deleteUser?: DeleteUserPayload;
  deleteUsers: UserConnection;
  createPost?: CreatePostPayload;
  createPosts: PostConnection;
  updatePost?: UpdatePostPayload;
  updatePosts: PostConnection;
  deletePost?: DeletePostPayload;
  deletePosts: PostConnection;
  create_Session?: Create_SessionPayload;
  create_Sessions: _SessionConnection;
  update_Session?: Update_SessionPayload;
  update_Sessions: _SessionConnection;
  delete_Session?: Delete_SessionPayload;
  delete_Sessions: _SessionConnection;
  createRole?: CreateRolePayload;
  createRoles: RoleConnection;
  updateRole?: UpdateRolePayload;
  updateRoles: RoleConnection;
  deleteRole?: DeleteRolePayload;
  deleteRoles: RoleConnection;
  create_InternalConfig?: Create_InternalConfigPayload;
  create_InternalConfigs: _InternalConfigConnection;
  update_InternalConfig?: Update_InternalConfigPayload;
  update_InternalConfigs: _InternalConfigConnection;
  delete_InternalConfig?: Delete_InternalConfigPayload;
  delete_InternalConfigs: _InternalConfigConnection;
  createMutation: Scalars['Boolean']['output'];
  customMutation?: Scalars['Int']['output'];
  secondCustomMutation?: Scalars['Int']['output'];
  resetPassword?: Scalars['Boolean']['output'];
  sendOtpCode?: Scalars['Boolean']['output'];
  sendEmail?: Scalars['String']['output'];
  signInWith?: SignInWithOutput;
  signUpWith?: SignUpWithOutput;
  signOut?: Scalars['Boolean']['output'];
  refresh?: RefreshSessionOutput;
  verifyChallenge?: Scalars['Boolean']['output'];
};

export type MutationCreateUserArgs = {
  input: CreateUserInput;
};

export type MutationCreateUsersArgs = {
  input: CreateUsersInput;
};

export type MutationUpdateUserArgs = {
  input: UpdateUserInput;
};

export type MutationUpdateUsersArgs = {
  input: UpdateUsersInput;
};

export type MutationDeleteUserArgs = {
  input: DeleteUserInput;
};

export type MutationDeleteUsersArgs = {
  input: DeleteUsersInput;
};

export type MutationCreatePostArgs = {
  input: CreatePostInput;
};

export type MutationCreatePostsArgs = {
  input: CreatePostsInput;
};

export type MutationUpdatePostArgs = {
  input: UpdatePostInput;
};

export type MutationUpdatePostsArgs = {
  input: UpdatePostsInput;
};

export type MutationDeletePostArgs = {
  input: DeletePostInput;
};

export type MutationDeletePostsArgs = {
  input: DeletePostsInput;
};

export type MutationCreate_SessionArgs = {
  input: Create_SessionInput;
};

export type MutationCreate_SessionsArgs = {
  input: Create_SessionsInput;
};

export type MutationUpdate_SessionArgs = {
  input: Update_SessionInput;
};

export type MutationUpdate_SessionsArgs = {
  input: Update_SessionsInput;
};

export type MutationDelete_SessionArgs = {
  input: Delete_SessionInput;
};

export type MutationDelete_SessionsArgs = {
  input: Delete_SessionsInput;
};

export type MutationCreateRoleArgs = {
  input: CreateRoleInput;
};

export type MutationCreateRolesArgs = {
  input: CreateRolesInput;
};

export type MutationUpdateRoleArgs = {
  input: UpdateRoleInput;
};

export type MutationUpdateRolesArgs = {
  input: UpdateRolesInput;
};

export type MutationDeleteRoleArgs = {
  input: DeleteRoleInput;
};

export type MutationDeleteRolesArgs = {
  input: DeleteRolesInput;
};

export type MutationCreate_InternalConfigArgs = {
  input: Create_InternalConfigInput;
};

export type MutationCreate_InternalConfigsArgs = {
  input: Create_InternalConfigsInput;
};

export type MutationUpdate_InternalConfigArgs = {
  input: Update_InternalConfigInput;
};

export type MutationUpdate_InternalConfigsArgs = {
  input: Update_InternalConfigsInput;
};

export type MutationDelete_InternalConfigArgs = {
  input: Delete_InternalConfigInput;
};

export type MutationDelete_InternalConfigsArgs = {
  input: Delete_InternalConfigsInput;
};

export type MutationCreateMutationArgs = {
  input: CreateMutationInput;
};

export type MutationCustomMutationArgs = {
  input: CustomMutationInput;
};

export type MutationSecondCustomMutationArgs = {
  input: SecondCustomMutationInput;
};

export type MutationResetPasswordArgs = {
  input: ResetPasswordInput;
};

export type MutationSendOtpCodeArgs = {
  input: SendOtpCodeInput;
};

export type MutationSendEmailArgs = {
  input: SendEmailInput;
};

export type MutationSignInWithArgs = {
  input: SignInWithInput;
};

export type MutationSignUpWithArgs = {
  input: SignUpWithInput;
};

export type MutationRefreshArgs = {
  input: RefreshInput;
};

export type MutationVerifyChallengeArgs = {
  input: VerifyChallengeInput;
};

export type CreateUserPayload = {
  user?: User;
  ok?: Scalars['Boolean']['output'];
};

export type CreateUserInput = {
  fields?: UserCreateFieldsInput;
};

export type CreateUsersInput = {
  fields: UserCreateFieldsInput[];
  offset?: Scalars['Int']['input'];
  first?: Scalars['Int']['input'];
  order?: UserOrder[];
};

export type UpdateUserPayload = {
  user?: User;
  ok?: Scalars['Boolean']['output'];
};

export type UpdateUserInput = {
  id?: Scalars['ID']['input'];
  fields?: UserUpdateFieldsInput;
};

export type UserUpdateFieldsInput = {
  name?: Scalars['String']['input'];
  age?: Scalars['Int']['input'];
  email?: Scalars['Email']['input'];
  tata?: Scalars['File']['input'];
  acl?: UserACLObjectUpdateFieldsInput;
  createdAt?: Scalars['Date']['input'];
  updatedAt?: Scalars['Date']['input'];
  search?: Scalars['String']['input'][];
  authentication?: UserAuthenticationUpdateFieldsInput;
  provider?: AuthenticationProvider;
  isOauth?: Scalars['Boolean']['input'];
  verifiedEmail?: Scalars['Boolean']['input'];
  role?: RolePointerInput;
  sessions?: _SessionRelationInput;
};

export type UserACLObjectUpdateFieldsInput = {
  users?: UserACLObjectUsersACLUpdateFieldsInput[];
  roles?: UserACLObjectRolesACLUpdateFieldsInput[];
};

export type UserACLObjectUsersACLUpdateFieldsInput = {
  userId?: Scalars['String']['input'];
  read?: Scalars['Boolean']['input'];
  write?: Scalars['Boolean']['input'];
};

export type UserACLObjectRolesACLUpdateFieldsInput = {
  roleId?: Scalars['String']['input'];
  read?: Scalars['Boolean']['input'];
  write?: Scalars['Boolean']['input'];
};

export type UserAuthenticationUpdateFieldsInput = {
  phonePassword?: UserAuthenticationPhonePasswordUpdateFieldsInput;
  emailPassword?: UserAuthenticationEmailPasswordUpdateFieldsInput;
  google?: UserAuthenticationGoogleUpdateFieldsInput;
  github?: UserAuthenticationGithubUpdateFieldsInput;
};

export type UserAuthenticationPhonePasswordUpdateFieldsInput = {
  phone?: Scalars['Phone']['input'];
  password?: Scalars['String']['input'];
};

export type UserAuthenticationEmailPasswordUpdateFieldsInput = {
  email?: Scalars['Email']['input'];
  password?: Scalars['String']['input'];
};

export type UserAuthenticationGoogleUpdateFieldsInput = {
  email?: Scalars['Email']['input'];
  verifiedEmail?: Scalars['Boolean']['input'];
};

export type UserAuthenticationGithubUpdateFieldsInput = {
  email?: Scalars['Email']['input'];
  avatarUrl?: Scalars['String']['input'];
  username?: Scalars['String']['input'];
};

export type UpdateUsersInput = {
  fields?: UserUpdateFieldsInput;
  where?: UserWhereInput;
  offset?: Scalars['Int']['input'];
  first?: Scalars['Int']['input'];
  order?: UserOrder[];
};

export type DeleteUserPayload = {
  user?: User;
  ok?: Scalars['Boolean']['output'];
};

export type DeleteUserInput = {
  id?: Scalars['ID']['input'];
};

export type DeleteUsersInput = {
  where?: UserWhereInput;
  order?: UserOrder[];
};

export type CreatePostPayload = {
  post?: Post;
  ok?: Scalars['Boolean']['output'];
};

export type CreatePostInput = {
  fields?: PostCreateFieldsInput;
};

export type CreatePostsInput = {
  fields: PostCreateFieldsInput[];
  offset?: Scalars['Int']['input'];
  first?: Scalars['Int']['input'];
  order?: PostOrder[];
};

export type UpdatePostPayload = {
  post?: Post;
  ok?: Scalars['Boolean']['output'];
};

export type UpdatePostInput = {
  id?: Scalars['ID']['input'];
  fields?: PostUpdateFieldsInput;
};

export type PostUpdateFieldsInput = {
  name?: Scalars['String']['input'];
  test2?: RoleEnum;
  acl?: PostACLObjectUpdateFieldsInput;
  createdAt?: Scalars['Date']['input'];
  updatedAt?: Scalars['Date']['input'];
  search?: Scalars['String']['input'][];
};

export type PostACLObjectUpdateFieldsInput = {
  users?: PostACLObjectUsersACLUpdateFieldsInput[];
  roles?: PostACLObjectRolesACLUpdateFieldsInput[];
};

export type PostACLObjectUsersACLUpdateFieldsInput = {
  userId?: Scalars['String']['input'];
  read?: Scalars['Boolean']['input'];
  write?: Scalars['Boolean']['input'];
};

export type PostACLObjectRolesACLUpdateFieldsInput = {
  roleId?: Scalars['String']['input'];
  read?: Scalars['Boolean']['input'];
  write?: Scalars['Boolean']['input'];
};

export type UpdatePostsInput = {
  fields?: PostUpdateFieldsInput;
  where?: PostWhereInput;
  offset?: Scalars['Int']['input'];
  first?: Scalars['Int']['input'];
  order?: PostOrder[];
};

export type DeletePostPayload = {
  post?: Post;
  ok?: Scalars['Boolean']['output'];
};

export type DeletePostInput = {
  id?: Scalars['ID']['input'];
};

export type DeletePostsInput = {
  where?: PostWhereInput;
  order?: PostOrder[];
};

export type Create_SessionPayload = {
  _session?: _Session;
  ok?: Scalars['Boolean']['output'];
};

export type Create_SessionInput = {
  fields?: _SessionCreateFieldsInput;
};

export type Create_SessionsInput = {
  fields: _SessionCreateFieldsInput[];
  offset?: Scalars['Int']['input'];
  first?: Scalars['Int']['input'];
  order?: _SessionOrder[];
};

export type Update_SessionPayload = {
  _session?: _Session;
  ok?: Scalars['Boolean']['output'];
};

export type Update_SessionInput = {
  id?: Scalars['ID']['input'];
  fields?: _SessionUpdateFieldsInput;
};

export type _SessionUpdateFieldsInput = {
  user?: UserPointerInput;
  accessToken?: Scalars['String']['input'];
  accessTokenExpiresAt?: Scalars['Date']['input'];
  refreshToken?: Scalars['String']['input'];
  refreshTokenExpiresAt?: Scalars['Date']['input'];
  acl?: _SessionACLObjectUpdateFieldsInput;
  createdAt?: Scalars['Date']['input'];
  updatedAt?: Scalars['Date']['input'];
  search?: Scalars['String']['input'][];
};

export type _SessionACLObjectUpdateFieldsInput = {
  users?: _SessionACLObjectUsersACLUpdateFieldsInput[];
  roles?: _SessionACLObjectRolesACLUpdateFieldsInput[];
};

export type _SessionACLObjectUsersACLUpdateFieldsInput = {
  userId?: Scalars['String']['input'];
  read?: Scalars['Boolean']['input'];
  write?: Scalars['Boolean']['input'];
};

export type _SessionACLObjectRolesACLUpdateFieldsInput = {
  roleId?: Scalars['String']['input'];
  read?: Scalars['Boolean']['input'];
  write?: Scalars['Boolean']['input'];
};

export type Update_SessionsInput = {
  fields?: _SessionUpdateFieldsInput;
  where?: _SessionWhereInput;
  offset?: Scalars['Int']['input'];
  first?: Scalars['Int']['input'];
  order?: _SessionOrder[];
};

export type Delete_SessionPayload = {
  _session?: _Session;
  ok?: Scalars['Boolean']['output'];
};

export type Delete_SessionInput = {
  id?: Scalars['ID']['input'];
};

export type Delete_SessionsInput = {
  where?: _SessionWhereInput;
  order?: _SessionOrder[];
};

export type CreateRolePayload = {
  role?: Role;
  ok?: Scalars['Boolean']['output'];
};

export type CreateRoleInput = {
  fields?: RoleCreateFieldsInput;
};

export type CreateRolesInput = {
  fields: RoleCreateFieldsInput[];
  offset?: Scalars['Int']['input'];
  first?: Scalars['Int']['input'];
  order?: RoleOrder[];
};

export type UpdateRolePayload = {
  role?: Role;
  ok?: Scalars['Boolean']['output'];
};

export type UpdateRoleInput = {
  id?: Scalars['ID']['input'];
  fields?: RoleUpdateFieldsInput;
};

export type RoleUpdateFieldsInput = {
  name?: Scalars['String']['input'];
  users?: UserRelationInput;
  acl?: RoleACLObjectUpdateFieldsInput;
  createdAt?: Scalars['Date']['input'];
  updatedAt?: Scalars['Date']['input'];
  search?: Scalars['String']['input'][];
};

export type RoleACLObjectUpdateFieldsInput = {
  users?: RoleACLObjectUsersACLUpdateFieldsInput[];
  roles?: RoleACLObjectRolesACLUpdateFieldsInput[];
};

export type RoleACLObjectUsersACLUpdateFieldsInput = {
  userId?: Scalars['String']['input'];
  read?: Scalars['Boolean']['input'];
  write?: Scalars['Boolean']['input'];
};

export type RoleACLObjectRolesACLUpdateFieldsInput = {
  roleId?: Scalars['String']['input'];
  read?: Scalars['Boolean']['input'];
  write?: Scalars['Boolean']['input'];
};

export type UpdateRolesInput = {
  fields?: RoleUpdateFieldsInput;
  where?: RoleWhereInput;
  offset?: Scalars['Int']['input'];
  first?: Scalars['Int']['input'];
  order?: RoleOrder[];
};

export type DeleteRolePayload = {
  role?: Role;
  ok?: Scalars['Boolean']['output'];
};

export type DeleteRoleInput = {
  id?: Scalars['ID']['input'];
};

export type DeleteRolesInput = {
  where?: RoleWhereInput;
  order?: RoleOrder[];
};

export type Create_InternalConfigPayload = {
  _internalConfig?: _InternalConfig;
  ok?: Scalars['Boolean']['output'];
};

export type Create_InternalConfigInput = {
  fields?: _InternalConfigCreateFieldsInput;
};

export type Create_InternalConfigsInput = {
  fields: _InternalConfigCreateFieldsInput[];
  offset?: Scalars['Int']['input'];
  first?: Scalars['Int']['input'];
  order?: _InternalConfigOrder[];
};

export type Update_InternalConfigPayload = {
  _internalConfig?: _InternalConfig;
  ok?: Scalars['Boolean']['output'];
};

export type Update_InternalConfigInput = {
  id?: Scalars['ID']['input'];
  fields?: _InternalConfigUpdateFieldsInput;
};

export type _InternalConfigUpdateFieldsInput = {
  configKey?: Scalars['String']['input'];
  configValue?: Scalars['String']['input'];
  description?: Scalars['String']['input'];
  acl?: _InternalConfigACLObjectUpdateFieldsInput;
  createdAt?: Scalars['Date']['input'];
  updatedAt?: Scalars['Date']['input'];
  search?: Scalars['String']['input'][];
};

export type _InternalConfigACLObjectUpdateFieldsInput = {
  users?: _InternalConfigACLObjectUsersACLUpdateFieldsInput[];
  roles?: _InternalConfigACLObjectRolesACLUpdateFieldsInput[];
};

export type _InternalConfigACLObjectUsersACLUpdateFieldsInput = {
  userId?: Scalars['String']['input'];
  read?: Scalars['Boolean']['input'];
  write?: Scalars['Boolean']['input'];
};

export type _InternalConfigACLObjectRolesACLUpdateFieldsInput = {
  roleId?: Scalars['String']['input'];
  read?: Scalars['Boolean']['input'];
  write?: Scalars['Boolean']['input'];
};

export type Update_InternalConfigsInput = {
  fields?: _InternalConfigUpdateFieldsInput;
  where?: _InternalConfigWhereInput;
  offset?: Scalars['Int']['input'];
  first?: Scalars['Int']['input'];
  order?: _InternalConfigOrder[];
};

export type Delete_InternalConfigPayload = {
  _internalConfig?: _InternalConfig;
  ok?: Scalars['Boolean']['output'];
};

export type Delete_InternalConfigInput = {
  id?: Scalars['ID']['input'];
};

export type Delete_InternalConfigsInput = {
  where?: _InternalConfigWhereInput;
  order?: _InternalConfigOrder[];
};

export type CreateMutationInput = {
  name: Scalars['Int']['input'];
};

export type CustomMutationInput = {
  a: Scalars['Int']['input'];
  b: Scalars['Int']['input'];
};

export type SecondCustomMutationInput = {
  sum?: SecondCustomMutationSumInput;
};

export type SecondCustomMutationSumInput = {
  a: Scalars['Int']['input'];
  b: Scalars['Int']['input'];
};

export type ResetPasswordInput = {
  password: Scalars['String']['input'];
  email: Scalars['Email']['input'];
  otp: Scalars['String']['input'];
  provider: AuthenticationProvider;
};

export type SendOtpCodeInput = {
  email: Scalars['Email']['input'];
};

export type SendEmailInput = {
  from: Scalars['String']['input'];
  to: Scalars['String']['input'][];
  subject: Scalars['String']['input'];
  text?: Scalars['String']['input'];
  html?: Scalars['String']['input'];
};

export type SignInWithOutput = {
  id?: Scalars['String']['output'];
  accessToken?: Scalars['String']['output'];
  refreshToken?: Scalars['String']['output'];
};

export type SignInWithInput = {
  authentication: SignInWithAuthenticationInput;
};

export type SignInWithAuthenticationInput = {
  phonePassword?: SignInWithAuthenticationPhonePasswordInput;
  emailPassword?: SignInWithAuthenticationEmailPasswordInput;
  google?: SignInWithAuthenticationGoogleInput;
  github?: SignInWithAuthenticationGithubInput;
  otp?: SignInWithAuthenticationOtpInput;
  secondaryFactor?: SecondaryFactor;
};

export type SignInWithAuthenticationPhonePasswordInput = {
  phone: Scalars['Phone']['input'];
  password: Scalars['String']['input'];
};

export type SignInWithAuthenticationEmailPasswordInput = {
  email: Scalars['Email']['input'];
  password: Scalars['String']['input'];
};

export type SignInWithAuthenticationGoogleInput = {
  authorizationCode: Scalars['String']['input'];
  codeVerifier: Scalars['String']['input'];
};

export type SignInWithAuthenticationGithubInput = {
  authorizationCode: Scalars['String']['input'];
  codeVerifier: Scalars['String']['input'];
};

export type SignInWithAuthenticationOtpInput = {
  code?: Scalars['String']['input'];
};

export type SignUpWithOutput = {
  id?: Scalars['String']['output'];
  accessToken: Scalars['String']['output'];
  refreshToken: Scalars['String']['output'];
};

export type SignUpWithInput = {
  authentication: SignUpWithAuthenticationInput;
};

export type SignUpWithAuthenticationInput = {
  phonePassword?: SignUpWithAuthenticationPhonePasswordInput;
  emailPassword?: SignUpWithAuthenticationEmailPasswordInput;
  google?: SignUpWithAuthenticationGoogleInput;
  github?: SignUpWithAuthenticationGithubInput;
  otp?: SignUpWithAuthenticationOtpInput;
  secondaryFactor?: SecondaryFactor;
};

export type SignUpWithAuthenticationPhonePasswordInput = {
  phone: Scalars['Phone']['input'];
  password: Scalars['String']['input'];
};

export type SignUpWithAuthenticationEmailPasswordInput = {
  email: Scalars['Email']['input'];
  password: Scalars['String']['input'];
};

export type SignUpWithAuthenticationGoogleInput = {
  authorizationCode: Scalars['String']['input'];
  codeVerifier: Scalars['String']['input'];
};

export type SignUpWithAuthenticationGithubInput = {
  authorizationCode: Scalars['String']['input'];
  codeVerifier: Scalars['String']['input'];
};

export type SignUpWithAuthenticationOtpInput = {
  code?: Scalars['String']['input'];
};

export type RefreshSessionOutput = {
  accessToken: Scalars['String']['output'];
  refreshToken: Scalars['String']['output'];
};

export type RefreshInput = {
  accessToken: Scalars['String']['input'];
  refreshToken: Scalars['String']['input'];
};

export type VerifyChallengeInput = {
  factor?: VerifyChallengeFactorInput;
};

export type VerifyChallengeFactorInput = {
  otp?: VerifyChallengeFactorOtpInput;
};

export type VerifyChallengeFactorOtpInput = {
  code?: Scalars['String']['input'];
};


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