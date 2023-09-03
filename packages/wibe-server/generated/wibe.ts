import { GraphQLClient, RequestOptions } from 'graphql-request';
import gql from 'graphql-tag';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
type GraphQLClientRequestHeaders = RequestOptions['requestHeaders'];
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** The Any scalar type is used in operations and types that involve any type of value. */
  Any: { input: any; output: any; }
  /** Date scalar type */
  Date: { input: any; output: any; }
  /** Email scalar type */
  Email: { input: any; output: any; }
  /** Phone custom scalar type */
  Phone: { input: any; output: any; }
};

export type AnyWhereInput = {
  equalTo?: InputMaybe<Scalars['Any']['input']>;
  notEqualTo?: InputMaybe<Scalars['Any']['input']>;
};

export enum AuthenticationProvider {
  Google = 'Google'
}

export type BooleanWhereInput = {
  equalTo?: InputMaybe<Scalars['Boolean']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Boolean']['input']>>>;
  notEqualTo?: InputMaybe<Scalars['Boolean']['input']>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['Boolean']['input']>>>;
};

export type CreateMutationInput = {
  name: Scalars['Int']['input'];
};

export type CreatePostInput = {
  fields?: InputMaybe<PostCreateFieldsInput>;
};

export type CreatePostPayload = {
  __typename?: 'CreatePostPayload';
  clientMutationId?: Maybe<Scalars['String']['output']>;
  post?: Maybe<Post>;
};

export type CreatePostsInput = {
  fields: Array<InputMaybe<PostCreateFieldsInput>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type Create_SessionInput = {
  fields?: InputMaybe<_SessionCreateFieldsInput>;
};

export type Create_SessionPayload = {
  __typename?: 'Create_SessionPayload';
  _session?: Maybe<_Session>;
  clientMutationId?: Maybe<Scalars['String']['output']>;
};

export type Create_SessionsInput = {
  fields: Array<InputMaybe<_SessionCreateFieldsInput>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type Create_UserInput = {
  fields?: InputMaybe<_UserCreateFieldsInput>;
};

export type Create_UserPayload = {
  __typename?: 'Create_UserPayload';
  _user?: Maybe<_User>;
  clientMutationId?: Maybe<Scalars['String']['output']>;
};

export type Create_UsersInput = {
  fields: Array<InputMaybe<_UserCreateFieldsInput>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type CustomMutationInput = {
  a: Scalars['Int']['input'];
  b: Scalars['Int']['input'];
};

export type DateWhereInput = {
  equalTo?: InputMaybe<Scalars['Date']['input']>;
  greaterThan?: InputMaybe<Scalars['Date']['input']>;
  greaterThanOrEqualTo?: InputMaybe<Scalars['Date']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Date']['input']>>>;
  lessThan?: InputMaybe<Scalars['Date']['input']>;
  lessThanOrEqualTo?: InputMaybe<Scalars['Date']['input']>;
  notEqualTo?: InputMaybe<Scalars['Date']['input']>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['Date']['input']>>>;
};

export type DeletePostInput = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type DeletePostPayload = {
  __typename?: 'DeletePostPayload';
  clientMutationId?: Maybe<Scalars['String']['output']>;
  post?: Maybe<Post>;
};

export type DeletePostsInput = {
  where?: InputMaybe<PostWhereInput>;
};

export type Delete_SessionInput = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type Delete_SessionPayload = {
  __typename?: 'Delete_SessionPayload';
  _session?: Maybe<_Session>;
  clientMutationId?: Maybe<Scalars['String']['output']>;
};

export type Delete_SessionsInput = {
  where?: InputMaybe<_SessionWhereInput>;
};

export type Delete_UserInput = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type Delete_UserPayload = {
  __typename?: 'Delete_UserPayload';
  _user?: Maybe<_User>;
  clientMutationId?: Maybe<Scalars['String']['output']>;
};

export type Delete_UsersInput = {
  where?: InputMaybe<_UserWhereInput>;
};

export type EmailWhereInput = {
  equalTo?: InputMaybe<Scalars['Email']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Email']['input']>>>;
  notEqualTo?: InputMaybe<Scalars['Email']['input']>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['Email']['input']>>>;
};

export type IntWhereInput = {
  equalTo?: InputMaybe<Scalars['Int']['input']>;
  greaterThan?: InputMaybe<Scalars['Int']['input']>;
  greaterThanOrEqualTo?: InputMaybe<Scalars['Int']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['Int']['input']>>>;
  lessThan?: InputMaybe<Scalars['Int']['input']>;
  lessThanOrEqualTo?: InputMaybe<Scalars['Int']['input']>;
  notEqualTo?: InputMaybe<Scalars['Int']['input']>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['Int']['input']>>>;
};

export type Mutation = {
  __typename?: 'Mutation';
  createMutation: Scalars['Boolean']['output'];
  createPost?: Maybe<CreatePostPayload>;
  createPosts: PostConnection;
  create_Session?: Maybe<Create_SessionPayload>;
  create_Sessions: _SessionConnection;
  /** User class */
  create_User?: Maybe<Create_UserPayload>;
  /** User class */
  create_Users: _UserConnection;
  customMutation?: Maybe<Scalars['Int']['output']>;
  deletePost?: Maybe<DeletePostPayload>;
  deletePosts: PostConnection;
  delete_Session?: Maybe<Delete_SessionPayload>;
  delete_Sessions: _SessionConnection;
  /** User class */
  delete_User?: Maybe<Delete_UserPayload>;
  /** User class */
  delete_Users: _UserConnection;
  refresh?: Maybe<Scalars['Boolean']['output']>;
  secondCustomMutation?: Maybe<Scalars['Int']['output']>;
  signInWith?: Maybe<Scalars['Boolean']['output']>;
  signOut?: Maybe<Scalars['Boolean']['output']>;
  signUpWith?: Maybe<Scalars['Boolean']['output']>;
  updatePost?: Maybe<UpdatePostPayload>;
  updatePosts: PostConnection;
  update_Session?: Maybe<Update_SessionPayload>;
  update_Sessions: _SessionConnection;
  /** User class */
  update_User?: Maybe<Update_UserPayload>;
  /** User class */
  update_Users: _UserConnection;
  verifyChallenge?: Maybe<Scalars['Boolean']['output']>;
};


export type MutationCreateMutationArgs = {
  input?: InputMaybe<CreateMutationInput>;
};


export type MutationCreatePostArgs = {
  input?: InputMaybe<CreatePostInput>;
};


export type MutationCreatePostsArgs = {
  input?: InputMaybe<CreatePostsInput>;
};


export type MutationCreate_SessionArgs = {
  input?: InputMaybe<Create_SessionInput>;
};


export type MutationCreate_SessionsArgs = {
  input?: InputMaybe<Create_SessionsInput>;
};


export type MutationCreate_UserArgs = {
  input?: InputMaybe<Create_UserInput>;
};


export type MutationCreate_UsersArgs = {
  input?: InputMaybe<Create_UsersInput>;
};


export type MutationCustomMutationArgs = {
  input?: InputMaybe<CustomMutationInput>;
};


export type MutationDeletePostArgs = {
  input?: InputMaybe<DeletePostInput>;
};


export type MutationDeletePostsArgs = {
  input?: InputMaybe<DeletePostsInput>;
};


export type MutationDelete_SessionArgs = {
  input?: InputMaybe<Delete_SessionInput>;
};


export type MutationDelete_SessionsArgs = {
  input?: InputMaybe<Delete_SessionsInput>;
};


export type MutationDelete_UserArgs = {
  input?: InputMaybe<Delete_UserInput>;
};


export type MutationDelete_UsersArgs = {
  input?: InputMaybe<Delete_UsersInput>;
};


export type MutationSecondCustomMutationArgs = {
  input?: InputMaybe<SecondCustomMutationInput>;
};


export type MutationSignInWithArgs = {
  input?: InputMaybe<SignInWithInput>;
};


export type MutationSignUpWithArgs = {
  input?: InputMaybe<SignUpWithInput>;
};


export type MutationUpdatePostArgs = {
  input?: InputMaybe<UpdatePostInput>;
};


export type MutationUpdatePostsArgs = {
  input?: InputMaybe<UpdatePostsInput>;
};


export type MutationUpdate_SessionArgs = {
  input?: InputMaybe<Update_SessionInput>;
};


export type MutationUpdate_SessionsArgs = {
  input?: InputMaybe<Update_SessionsInput>;
};


export type MutationUpdate_UserArgs = {
  input?: InputMaybe<Update_UserInput>;
};


export type MutationUpdate_UsersArgs = {
  input?: InputMaybe<Update_UsersInput>;
};


export type MutationVerifyChallengeArgs = {
  input?: InputMaybe<VerifyChallengeInput>;
};

export type Post = {
  __typename?: 'Post';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type PostConnection = {
  __typename?: 'PostConnection';
  edges?: Maybe<Array<Maybe<PostEdge>>>;
};

export type PostCreateFieldsInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type PostEdge = {
  __typename?: 'PostEdge';
  node: Post;
};

export type PostInput = {
  name: Scalars['String']['input'];
};

/** Input to link an object to a pointer Post */
export type PostPointerInput = {
  createAndLink?: InputMaybe<PostCreateFieldsInput>;
  link?: InputMaybe<Scalars['ID']['input']>;
};

export type PostUpdateFieldsInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type PostWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<PostWhereInput>>>;
  OR?: InputMaybe<Array<InputMaybe<PostWhereInput>>>;
  name?: InputMaybe<StringWhereInput>;
};

export type Query = {
  __typename?: 'Query';
  _session?: Maybe<_Session>;
  _sessions: _SessionConnection;
  /** User class */
  _user?: Maybe<_User>;
  /** User class */
  _users: _UserConnection;
  /** Hello world description */
  helloWorld?: Maybe<Scalars['String']['output']>;
  post?: Maybe<Post>;
  posts: PostConnection;
};


export type Query_SessionArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type Query_SessionsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<_SessionWhereInput>;
};


export type Query_UserArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type Query_UsersArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<_UserWhereInput>;
};


export type QueryHelloWorldArgs = {
  name: Scalars['String']['input'];
};


export type QueryPostArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryPostsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<PostWhereInput>;
};

export enum Role {
  Admin = 'Admin',
  Member = 'Member'
}

export type SecondCustomMutationInput = {
  sum?: InputMaybe<SecondCustomMutationSumInput>;
};

export type SecondCustomMutationSumInput = {
  a: Scalars['Int']['input'];
  b: Scalars['Int']['input'];
};

export enum SecondaryFactor {
  EmailOtp = 'EmailOTP'
}

export type SignInWithAuthenticationEmailPasswordInput = {
  email: Scalars['Email']['input'];
  password: Scalars['String']['input'];
};

export type SignInWithAuthenticationInput = {
  emailPassword?: InputMaybe<SignInWithAuthenticationEmailPasswordInput>;
  otp?: InputMaybe<SignInWithAuthenticationOtpInput>;
  secondaryFactor?: InputMaybe<SecondaryFactor>;
};

export type SignInWithAuthenticationOtpInput = {
  code?: InputMaybe<Scalars['String']['input']>;
};

export type SignInWithInput = {
  authentication?: InputMaybe<SignInWithAuthenticationInput>;
};

export type SignUpWithAuthenticationEmailPasswordInput = {
  email: Scalars['Email']['input'];
  password: Scalars['String']['input'];
};

export type SignUpWithAuthenticationInput = {
  emailPassword?: InputMaybe<SignUpWithAuthenticationEmailPasswordInput>;
  otp?: InputMaybe<SignUpWithAuthenticationOtpInput>;
  secondaryFactor?: InputMaybe<SecondaryFactor>;
};

export type SignUpWithAuthenticationOtpInput = {
  code?: InputMaybe<Scalars['String']['input']>;
};

export type SignUpWithInput = {
  authentication?: InputMaybe<SignUpWithAuthenticationInput>;
};

export type StringWhereInput = {
  equalTo?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  notEqualTo?: InputMaybe<Scalars['String']['input']>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

export type UpdatePostInput = {
  fields?: InputMaybe<PostUpdateFieldsInput>;
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type UpdatePostPayload = {
  __typename?: 'UpdatePostPayload';
  clientMutationId?: Maybe<Scalars['String']['output']>;
  post?: Maybe<Post>;
};

export type UpdatePostsInput = {
  fields?: InputMaybe<PostUpdateFieldsInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<PostWhereInput>;
};

export type Update_SessionInput = {
  fields?: InputMaybe<_SessionUpdateFieldsInput>;
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type Update_SessionPayload = {
  __typename?: 'Update_SessionPayload';
  _session?: Maybe<_Session>;
  clientMutationId?: Maybe<Scalars['String']['output']>;
};

export type Update_SessionsInput = {
  fields?: InputMaybe<_SessionUpdateFieldsInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<_SessionWhereInput>;
};

export type Update_UserInput = {
  fields?: InputMaybe<_UserUpdateFieldsInput>;
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type Update_UserPayload = {
  __typename?: 'Update_UserPayload';
  _user?: Maybe<_User>;
  clientMutationId?: Maybe<Scalars['String']['output']>;
};

export type Update_UsersInput = {
  fields?: InputMaybe<_UserUpdateFieldsInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<_UserWhereInput>;
};

export type VerifyChallengeFactorInput = {
  otp?: InputMaybe<VerifyChallengeFactorOtpInput>;
};

export type VerifyChallengeFactorOtpInput = {
  code?: InputMaybe<Scalars['String']['input']>;
};

export type VerifyChallengeInput = {
  factor?: InputMaybe<VerifyChallengeFactorInput>;
};

export type _Session = {
  __typename?: '_Session';
  accessToken: Scalars['String']['output'];
  accessTokenExpiresAt: Scalars['Date']['output'];
  createdAt: Scalars['Date']['output'];
  id: Scalars['ID']['output'];
  refreshToken?: Maybe<Scalars['String']['output']>;
  refreshTokenExpiresAt: Scalars['Date']['output'];
  updatedAt: Scalars['Date']['output'];
  userId: Scalars['String']['output'];
};

export type _SessionConnection = {
  __typename?: '_SessionConnection';
  edges?: Maybe<Array<Maybe<_SessionEdge>>>;
};

export type _SessionCreateFieldsInput = {
  accessToken?: InputMaybe<Scalars['String']['input']>;
  accessTokenExpiresAt?: InputMaybe<Scalars['Date']['input']>;
  createdAt?: InputMaybe<Scalars['Date']['input']>;
  refreshToken?: InputMaybe<Scalars['String']['input']>;
  refreshTokenExpiresAt?: InputMaybe<Scalars['Date']['input']>;
  updatedAt?: InputMaybe<Scalars['Date']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type _SessionEdge = {
  __typename?: '_SessionEdge';
  node: _Session;
};

export type _SessionInput = {
  accessToken: Scalars['String']['input'];
  accessTokenExpiresAt: Scalars['Date']['input'];
  createdAt: Scalars['Date']['input'];
  refreshToken?: InputMaybe<Scalars['String']['input']>;
  refreshTokenExpiresAt: Scalars['Date']['input'];
  updatedAt: Scalars['Date']['input'];
  userId: Scalars['String']['input'];
};

/** Input to link an object to a pointer _Session */
export type _SessionPointerInput = {
  createAndLink?: InputMaybe<_SessionCreateFieldsInput>;
  link?: InputMaybe<Scalars['ID']['input']>;
};

export type _SessionUpdateFieldsInput = {
  accessToken?: InputMaybe<Scalars['String']['input']>;
  accessTokenExpiresAt?: InputMaybe<Scalars['Date']['input']>;
  createdAt?: InputMaybe<Scalars['Date']['input']>;
  refreshToken?: InputMaybe<Scalars['String']['input']>;
  refreshTokenExpiresAt?: InputMaybe<Scalars['Date']['input']>;
  updatedAt?: InputMaybe<Scalars['Date']['input']>;
  userId?: InputMaybe<Scalars['String']['input']>;
};

export type _SessionWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<_SessionWhereInput>>>;
  OR?: InputMaybe<Array<InputMaybe<_SessionWhereInput>>>;
  accessToken?: InputMaybe<StringWhereInput>;
  accessTokenExpiresAt?: InputMaybe<DateWhereInput>;
  createdAt?: InputMaybe<DateWhereInput>;
  refreshToken?: InputMaybe<StringWhereInput>;
  refreshTokenExpiresAt?: InputMaybe<DateWhereInput>;
  updatedAt?: InputMaybe<DateWhereInput>;
  userId?: InputMaybe<StringWhereInput>;
};

/** User class */
export type _User = {
  __typename?: '_User';
  address?: Maybe<_UserAddress>;
  age?: Maybe<Scalars['Int']['output']>;
  authentication?: Maybe<_UserAuthentication>;
  birthDate?: Maybe<Scalars['Date']['output']>;
  createdAt?: Maybe<Scalars['Date']['output']>;
  email?: Maybe<Scalars['Email']['output']>;
  id: Scalars['ID']['output'];
  isCool?: Maybe<Scalars['Boolean']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  object?: Maybe<_UserObject>;
  phone?: Maybe<Scalars['Phone']['output']>;
  post?: Maybe<Post>;
  provider?: Maybe<AuthenticationProvider>;
  role?: Maybe<Role>;
  updatedAt?: Maybe<Scalars['Date']['output']>;
  verifiedEmail?: Maybe<Scalars['Boolean']['output']>;
};

export type _UserAddress = {
  __typename?: '_UserAddress';
  address1?: Maybe<Scalars['String']['output']>;
  address2?: Maybe<Scalars['String']['output']>;
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  postalCode?: Maybe<Scalars['Int']['output']>;
};

export type _UserAddressCreateFieldsInput = {
  address1?: InputMaybe<Scalars['String']['input']>;
  address2?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  postalCode?: InputMaybe<Scalars['Int']['input']>;
};

export type _UserAddressInput = {
  address1?: InputMaybe<Scalars['String']['input']>;
  address2?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  postalCode?: InputMaybe<Scalars['Int']['input']>;
};

export type _UserAddressUpdateFieldsInput = {
  address1?: InputMaybe<Scalars['String']['input']>;
  address2?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  postalCode?: InputMaybe<Scalars['Int']['input']>;
};

export type _UserAddressWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<_UserAddressWhereInput>>>;
  OR?: InputMaybe<Array<InputMaybe<_UserAddressWhereInput>>>;
  address1?: InputMaybe<StringWhereInput>;
  address2?: InputMaybe<StringWhereInput>;
  city?: InputMaybe<StringWhereInput>;
  country?: InputMaybe<StringWhereInput>;
  postalCode?: InputMaybe<IntWhereInput>;
};

export type _UserAuthentication = {
  __typename?: '_UserAuthentication';
  emailPassword?: Maybe<_UserAuthenticationEmailPassword>;
  otp?: Maybe<_UserAuthenticationOtp>;
};

export type _UserAuthenticationCreateFieldsInput = {
  emailPassword?: InputMaybe<_UserAuthenticationEmailPasswordCreateFieldsInput>;
  otp?: InputMaybe<_UserAuthenticationOtpCreateFieldsInput>;
};

export type _UserAuthenticationEmailPassword = {
  __typename?: '_UserAuthenticationEmailPassword';
  email: Scalars['Email']['output'];
  password: Scalars['String']['output'];
};

export type _UserAuthenticationEmailPasswordCreateFieldsInput = {
  email?: InputMaybe<Scalars['Email']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
};

export type _UserAuthenticationEmailPasswordInput = {
  email: Scalars['Email']['input'];
  password: Scalars['String']['input'];
};

export type _UserAuthenticationEmailPasswordUpdateFieldsInput = {
  email?: InputMaybe<Scalars['Email']['input']>;
  password?: InputMaybe<Scalars['String']['input']>;
};

export type _UserAuthenticationEmailPasswordWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<_UserAuthenticationEmailPasswordWhereInput>>>;
  OR?: InputMaybe<Array<InputMaybe<_UserAuthenticationEmailPasswordWhereInput>>>;
  email?: InputMaybe<EmailWhereInput>;
  password?: InputMaybe<StringWhereInput>;
};

export type _UserAuthenticationInput = {
  emailPassword?: InputMaybe<_UserAuthenticationEmailPasswordInput>;
  otp?: InputMaybe<_UserAuthenticationOtpInput>;
};

export type _UserAuthenticationOtp = {
  __typename?: '_UserAuthenticationOtp';
  code?: Maybe<Scalars['String']['output']>;
};

export type _UserAuthenticationOtpCreateFieldsInput = {
  code?: InputMaybe<Scalars['String']['input']>;
};

export type _UserAuthenticationOtpInput = {
  code?: InputMaybe<Scalars['String']['input']>;
};

export type _UserAuthenticationOtpUpdateFieldsInput = {
  code?: InputMaybe<Scalars['String']['input']>;
};

export type _UserAuthenticationOtpWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<_UserAuthenticationOtpWhereInput>>>;
  OR?: InputMaybe<Array<InputMaybe<_UserAuthenticationOtpWhereInput>>>;
  code?: InputMaybe<StringWhereInput>;
};

export type _UserAuthenticationUpdateFieldsInput = {
  emailPassword?: InputMaybe<_UserAuthenticationEmailPasswordUpdateFieldsInput>;
  otp?: InputMaybe<_UserAuthenticationOtpUpdateFieldsInput>;
};

export type _UserAuthenticationWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<_UserAuthenticationWhereInput>>>;
  OR?: InputMaybe<Array<InputMaybe<_UserAuthenticationWhereInput>>>;
  emailPassword?: InputMaybe<_UserAuthenticationEmailPasswordWhereInput>;
  otp?: InputMaybe<_UserAuthenticationOtpWhereInput>;
};

export type _UserConnection = {
  __typename?: '_UserConnection';
  edges?: Maybe<Array<Maybe<_UserEdge>>>;
};

/** User class */
export type _UserCreateFieldsInput = {
  address?: InputMaybe<_UserAddressCreateFieldsInput>;
  age?: InputMaybe<Scalars['Int']['input']>;
  authentication?: InputMaybe<_UserAuthenticationCreateFieldsInput>;
  birthDate?: InputMaybe<Scalars['Date']['input']>;
  createdAt?: InputMaybe<Scalars['Date']['input']>;
  email?: InputMaybe<Scalars['Email']['input']>;
  isCool?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  object?: InputMaybe<_UserObjectCreateFieldsInput>;
  phone?: InputMaybe<Scalars['Phone']['input']>;
  provider?: InputMaybe<AuthenticationProvider>;
  role?: InputMaybe<Role>;
  updatedAt?: InputMaybe<Scalars['Date']['input']>;
  verifiedEmail?: InputMaybe<Scalars['Boolean']['input']>;
};

export type _UserEdge = {
  __typename?: '_UserEdge';
  node: _User;
};

/** User class */
export type _UserInput = {
  address?: InputMaybe<_UserAddressInput>;
  age?: InputMaybe<Scalars['Int']['input']>;
  authentication?: InputMaybe<_UserAuthenticationInput>;
  birthDate?: InputMaybe<Scalars['Date']['input']>;
  createdAt?: InputMaybe<Scalars['Date']['input']>;
  email?: InputMaybe<Scalars['Email']['input']>;
  isCool?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  object?: InputMaybe<_UserObjectInput>;
  phone?: InputMaybe<Scalars['Phone']['input']>;
  post?: InputMaybe<PostInput>;
  provider?: InputMaybe<AuthenticationProvider>;
  role?: InputMaybe<Role>;
  updatedAt?: InputMaybe<Scalars['Date']['input']>;
  verifiedEmail?: InputMaybe<Scalars['Boolean']['input']>;
};

export type _UserObject = {
  __typename?: '_UserObject';
  objectOfObject?: Maybe<_UserObjectObjectOfObject>;
};

export type _UserObjectCreateFieldsInput = {
  objectOfObject?: InputMaybe<_UserObjectObjectOfObjectCreateFieldsInput>;
};

export type _UserObjectInput = {
  objectOfObject?: InputMaybe<_UserObjectObjectOfObjectInput>;
};

export type _UserObjectObjectOfObject = {
  __typename?: '_UserObjectObjectOfObject';
  name?: Maybe<Scalars['String']['output']>;
};

export type _UserObjectObjectOfObjectCreateFieldsInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type _UserObjectObjectOfObjectInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type _UserObjectObjectOfObjectUpdateFieldsInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type _UserObjectObjectOfObjectWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<_UserObjectObjectOfObjectWhereInput>>>;
  OR?: InputMaybe<Array<InputMaybe<_UserObjectObjectOfObjectWhereInput>>>;
  name?: InputMaybe<StringWhereInput>;
};

export type _UserObjectUpdateFieldsInput = {
  objectOfObject?: InputMaybe<_UserObjectObjectOfObjectUpdateFieldsInput>;
};

export type _UserObjectWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<_UserObjectWhereInput>>>;
  OR?: InputMaybe<Array<InputMaybe<_UserObjectWhereInput>>>;
  objectOfObject?: InputMaybe<_UserObjectObjectOfObjectWhereInput>;
};

/** Input to link an object to a pointer _User */
export type _UserPointerInput = {
  createAndLink?: InputMaybe<_UserCreateFieldsInput>;
  link?: InputMaybe<Scalars['ID']['input']>;
};

/** User class */
export type _UserUpdateFieldsInput = {
  address?: InputMaybe<_UserAddressUpdateFieldsInput>;
  age?: InputMaybe<Scalars['Int']['input']>;
  authentication?: InputMaybe<_UserAuthenticationUpdateFieldsInput>;
  birthDate?: InputMaybe<Scalars['Date']['input']>;
  createdAt?: InputMaybe<Scalars['Date']['input']>;
  email?: InputMaybe<Scalars['Email']['input']>;
  isCool?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  object?: InputMaybe<_UserObjectUpdateFieldsInput>;
  phone?: InputMaybe<Scalars['Phone']['input']>;
  provider?: InputMaybe<AuthenticationProvider>;
  role?: InputMaybe<Role>;
  updatedAt?: InputMaybe<Scalars['Date']['input']>;
  verifiedEmail?: InputMaybe<Scalars['Boolean']['input']>;
};

/** User class */
export type _UserWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<_UserWhereInput>>>;
  OR?: InputMaybe<Array<InputMaybe<_UserWhereInput>>>;
  address?: InputMaybe<_UserAddressWhereInput>;
  age?: InputMaybe<IntWhereInput>;
  authentication?: InputMaybe<_UserAuthenticationWhereInput>;
  birthDate?: InputMaybe<DateWhereInput>;
  createdAt?: InputMaybe<DateWhereInput>;
  email?: InputMaybe<EmailWhereInput>;
  isCool?: InputMaybe<BooleanWhereInput>;
  name?: InputMaybe<StringWhereInput>;
  object?: InputMaybe<_UserObjectWhereInput>;
  phone?: InputMaybe<AnyWhereInput>;
  post?: InputMaybe<PostWhereInput>;
  provider?: InputMaybe<AnyWhereInput>;
  role?: InputMaybe<AnyWhereInput>;
  updatedAt?: InputMaybe<DateWhereInput>;
  verifiedEmail?: InputMaybe<BooleanWhereInput>;
};



export type SdkFunctionWrapper = <T>(action: (requestHeaders?:Record<string, string>) => Promise<T>, operationName: string, operationType?: string, variables?: any) => Promise<T>;


const defaultWrapper: SdkFunctionWrapper = (action, _operationName, _operationType, _variables) => action();

export function getSdk(client: GraphQLClient, withWrapper: SdkFunctionWrapper = defaultWrapper) {
  return {

  };
}
export type Sdk = ReturnType<typeof getSdk>;

export type WibeSchemaScalars = "Phone"

export type WibeSchemaEnums = "Role" | "AuthenticationProvider" | "SecondaryFactor"

export type WibeSchemaTypes = {
	_User: _User,
	Post: Post,
	_Session: _Session
}