import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
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

export type Address = {
  __typename?: 'Address';
  address1?: Maybe<Scalars['String']['output']>;
  address2?: Maybe<Scalars['String']['output']>;
  city?: Maybe<Scalars['String']['output']>;
  country?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  postalCode?: Maybe<Scalars['Int']['output']>;
};

export type AddressInput = {
  address1?: InputMaybe<Scalars['String']['input']>;
  address2?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  postalCode?: InputMaybe<Scalars['Int']['input']>;
};

export type AddressUpdateFieldsInput = {
  address1?: InputMaybe<Scalars['String']['input']>;
  address2?: InputMaybe<Scalars['String']['input']>;
  city?: InputMaybe<Scalars['String']['input']>;
  country?: InputMaybe<Scalars['String']['input']>;
  postalCode?: InputMaybe<Scalars['Int']['input']>;
};

export type AddressWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<AddressWhereInput>>>;
  OR?: InputMaybe<Array<InputMaybe<AddressWhereInput>>>;
  address1?: InputMaybe<StringWhereInput>;
  address2?: InputMaybe<StringWhereInput>;
  city?: InputMaybe<StringWhereInput>;
  country?: InputMaybe<StringWhereInput>;
  postalCode?: InputMaybe<IntWhereInput>;
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
  createManyPost: PostConnection;
  /** User class */
  createMany_User: _UserConnection;
  createOnePost: Post;
  /** User class */
  createOne_User: _User;
  deleteManyPost: PostConnection;
  /** User class */
  deleteMany_User: _UserConnection;
  deleteOnePost: Post;
  /** User class */
  deleteOne_User: _User;
  signIn?: Maybe<Scalars['Boolean']['output']>;
  signInWithProvider?: Maybe<Scalars['Boolean']['output']>;
  signUp?: Maybe<Scalars['Boolean']['output']>;
  updateManyPost: PostConnection;
  /** User class */
  updateMany_User: _UserConnection;
  updateOnePost: Post;
  /** User class */
  updateOne_User: _User;
};


export type MutationCreateManyPostArgs = {
  input?: InputMaybe<PostsCreateInput>;
};


export type MutationCreateMany_UserArgs = {
  input?: InputMaybe<_UsersCreateInput>;
};


export type MutationCreateOnePostArgs = {
  input?: InputMaybe<PostCreateInput>;
};


export type MutationCreateOne_UserArgs = {
  input?: InputMaybe<_UserCreateInput>;
};


export type MutationDeleteManyPostArgs = {
  input?: InputMaybe<PostsDeleteInput>;
};


export type MutationDeleteMany_UserArgs = {
  input?: InputMaybe<_UsersDeleteInput>;
};


export type MutationDeleteOnePostArgs = {
  input?: InputMaybe<PostDeleteInput>;
};


export type MutationDeleteOne_UserArgs = {
  input?: InputMaybe<_UserDeleteInput>;
};


export type MutationSignInArgs = {
  input?: InputMaybe<SignInInput>;
};


export type MutationSignInWithProviderArgs = {
  input?: InputMaybe<SignInWithProviderInput>;
};


export type MutationSignUpArgs = {
  input?: InputMaybe<SignUpInput>;
};


export type MutationUpdateManyPostArgs = {
  input?: InputMaybe<PostsUpdateInput>;
};


export type MutationUpdateMany_UserArgs = {
  input?: InputMaybe<_UsersUpdateInput>;
};


export type MutationUpdateOnePostArgs = {
  input?: InputMaybe<PostUpdateInput>;
};


export type MutationUpdateOne_UserArgs = {
  input?: InputMaybe<_UserUpdateInput>;
};

export type Object = {
  __typename?: 'Object';
  id: Scalars['ID']['output'];
  objectOfObject?: Maybe<ObjectOfObject>;
};

export type ObjectInput = {
  objectOfObject?: InputMaybe<ObjectOfObjectInput>;
};

export type ObjectOfObject = {
  __typename?: 'ObjectOfObject';
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
};

export type ObjectOfObjectInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type ObjectOfObjectUpdateFieldsInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type ObjectOfObjectWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<ObjectOfObjectWhereInput>>>;
  OR?: InputMaybe<Array<InputMaybe<ObjectOfObjectWhereInput>>>;
  name?: InputMaybe<StringWhereInput>;
};

export type ObjectUpdateFieldsInput = {
  objectOfObject?: InputMaybe<ObjectOfObjectUpdateFieldsInput>;
};

export type ObjectWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<ObjectWhereInput>>>;
  OR?: InputMaybe<Array<InputMaybe<ObjectWhereInput>>>;
  objectOfObject?: InputMaybe<ObjectOfObjectWhereInput>;
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

export type PostCreateInput = {
  fields?: InputMaybe<PostInput>;
};

export type PostDeleteInput = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type PostEdge = {
  __typename?: 'PostEdge';
  node?: Maybe<Post>;
};

export type PostInput = {
  name: Scalars['String']['input'];
};

export type PostUpdateFieldsInput = {
  name?: InputMaybe<Scalars['String']['input']>;
};

export type PostUpdateInput = {
  fields?: InputMaybe<PostUpdateFieldsInput>;
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type PostWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<PostWhereInput>>>;
  OR?: InputMaybe<Array<InputMaybe<PostWhereInput>>>;
  name?: InputMaybe<StringWhereInput>;
};

export type PostsCreateInput = {
  fields: Array<InputMaybe<PostInput>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type PostsDeleteInput = {
  where?: InputMaybe<PostWhereInput>;
};

export type PostsUpdateInput = {
  fields?: InputMaybe<PostUpdateFieldsInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<PostWhereInput>;
};

export type Query = {
  __typename?: 'Query';
  findManyPost: PostConnection;
  /** User class */
  findMany_User: _UserConnection;
  findOnePost?: Maybe<Post>;
  /** User class */
  findOne_User?: Maybe<_User>;
  /** Hello world description */
  helloWorld?: Maybe<Scalars['String']['output']>;
};


export type QueryFindManyPostArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<PostWhereInput>;
};


export type QueryFindMany_UserArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<_UserWhereInput>;
};


export type QueryFindOnePostArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryFindOne_UserArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryHelloWorldArgs = {
  name: Scalars['String']['input'];
};

export enum Role {
  Admin = 'Admin',
  Member = 'Member'
}

export type SignInInput = {
  email: Scalars['Email']['input'];
  password: Scalars['String']['input'];
};

export type SignInWithProviderInput = {
  accessToken: Scalars['String']['input'];
  email: Scalars['Email']['input'];
  provider: AuthenticationProvider;
  refreshToken?: InputMaybe<Scalars['String']['input']>;
  verifiedEmail: Scalars['Boolean']['input'];
};

export type SignUpInput = {
  email: Scalars['Email']['input'];
  password: Scalars['String']['input'];
};

export type StringWhereInput = {
  equalTo?: InputMaybe<Scalars['String']['input']>;
  in?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
  notEqualTo?: InputMaybe<Scalars['String']['input']>;
  notIn?: InputMaybe<Array<InputMaybe<Scalars['String']['input']>>>;
};

/** User class */
export type _User = {
  __typename?: '_User';
  accessToken?: Maybe<Scalars['String']['output']>;
  address?: Maybe<Address>;
  age?: Maybe<Scalars['Int']['output']>;
  birthDate: Scalars['Date']['output'];
  email: Scalars['Email']['output'];
  id: Scalars['ID']['output'];
  isCool?: Maybe<Scalars['Boolean']['output']>;
  name: Scalars['String']['output'];
  object?: Maybe<Object>;
  password?: Maybe<Scalars['String']['output']>;
  phone?: Maybe<Scalars['Phone']['output']>;
  provider?: Maybe<AuthenticationProvider>;
  refreshToken?: Maybe<Scalars['String']['output']>;
  role?: Maybe<Role>;
  verifiedEmail?: Maybe<Scalars['Boolean']['output']>;
};

export type _UserConnection = {
  __typename?: '_UserConnection';
  edges?: Maybe<Array<Maybe<_UserEdge>>>;
};

export type _UserCreateInput = {
  fields?: InputMaybe<_UserInput>;
};

export type _UserDeleteInput = {
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type _UserEdge = {
  __typename?: '_UserEdge';
  node?: Maybe<_User>;
};

export type _UserInput = {
  accessToken?: InputMaybe<Scalars['String']['input']>;
  address?: InputMaybe<AddressInput>;
  age?: InputMaybe<Scalars['Int']['input']>;
  birthDate: Scalars['Date']['input'];
  email: Scalars['Email']['input'];
  isCool?: InputMaybe<Scalars['Boolean']['input']>;
  name: Scalars['String']['input'];
  object?: InputMaybe<ObjectInput>;
  password?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['Phone']['input']>;
  provider?: InputMaybe<AuthenticationProvider>;
  refreshToken?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Role>;
  verifiedEmail?: InputMaybe<Scalars['Boolean']['input']>;
};

export type _UserUpdateFieldsInput = {
  accessToken?: InputMaybe<Scalars['String']['input']>;
  address?: InputMaybe<AddressUpdateFieldsInput>;
  age?: InputMaybe<Scalars['Int']['input']>;
  birthDate?: InputMaybe<Scalars['Date']['input']>;
  email?: InputMaybe<Scalars['Email']['input']>;
  isCool?: InputMaybe<Scalars['Boolean']['input']>;
  name?: InputMaybe<Scalars['String']['input']>;
  object?: InputMaybe<ObjectUpdateFieldsInput>;
  password?: InputMaybe<Scalars['String']['input']>;
  phone?: InputMaybe<Scalars['Phone']['input']>;
  provider?: InputMaybe<AuthenticationProvider>;
  refreshToken?: InputMaybe<Scalars['String']['input']>;
  role?: InputMaybe<Role>;
  verifiedEmail?: InputMaybe<Scalars['Boolean']['input']>;
};

export type _UserUpdateInput = {
  fields?: InputMaybe<_UserUpdateFieldsInput>;
  id?: InputMaybe<Scalars['ID']['input']>;
};

export type _UserWhereInput = {
  AND?: InputMaybe<Array<InputMaybe<_UserWhereInput>>>;
  OR?: InputMaybe<Array<InputMaybe<_UserWhereInput>>>;
  accessToken?: InputMaybe<StringWhereInput>;
  address?: InputMaybe<AddressWhereInput>;
  age?: InputMaybe<IntWhereInput>;
  birthDate?: InputMaybe<DateWhereInput>;
  email?: InputMaybe<EmailWhereInput>;
  isCool?: InputMaybe<BooleanWhereInput>;
  name?: InputMaybe<StringWhereInput>;
  object?: InputMaybe<ObjectWhereInput>;
  password?: InputMaybe<StringWhereInput>;
  phone?: InputMaybe<Scalars['Phone']['input']>;
  provider?: InputMaybe<AnyWhereInput>;
  refreshToken?: InputMaybe<StringWhereInput>;
  role?: InputMaybe<AnyWhereInput>;
  verifiedEmail?: InputMaybe<BooleanWhereInput>;
};

export type _UsersCreateInput = {
  fields: Array<InputMaybe<_UserInput>>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};

export type _UsersDeleteInput = {
  where?: InputMaybe<_UserWhereInput>;
};

export type _UsersUpdateInput = {
  fields?: InputMaybe<_UserUpdateFieldsInput>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  where?: InputMaybe<_UserWhereInput>;
};



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Address: ResolverTypeWrapper<Address>;
  AddressInput: AddressInput;
  AddressUpdateFieldsInput: AddressUpdateFieldsInput;
  AddressWhereInput: AddressWhereInput;
  Any: ResolverTypeWrapper<Scalars['Any']['output']>;
  AnyWhereInput: AnyWhereInput;
  AuthenticationProvider: AuthenticationProvider;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  BooleanWhereInput: BooleanWhereInput;
  Date: ResolverTypeWrapper<Scalars['Date']['output']>;
  DateWhereInput: DateWhereInput;
  Email: ResolverTypeWrapper<Scalars['Email']['output']>;
  EmailWhereInput: EmailWhereInput;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  IntWhereInput: IntWhereInput;
  Mutation: ResolverTypeWrapper<{}>;
  Object: ResolverTypeWrapper<Object>;
  ObjectInput: ObjectInput;
  ObjectOfObject: ResolverTypeWrapper<ObjectOfObject>;
  ObjectOfObjectInput: ObjectOfObjectInput;
  ObjectOfObjectUpdateFieldsInput: ObjectOfObjectUpdateFieldsInput;
  ObjectOfObjectWhereInput: ObjectOfObjectWhereInput;
  ObjectUpdateFieldsInput: ObjectUpdateFieldsInput;
  ObjectWhereInput: ObjectWhereInput;
  Phone: ResolverTypeWrapper<Scalars['Phone']['output']>;
  Post: ResolverTypeWrapper<Post>;
  PostConnection: ResolverTypeWrapper<PostConnection>;
  PostCreateInput: PostCreateInput;
  PostDeleteInput: PostDeleteInput;
  PostEdge: ResolverTypeWrapper<PostEdge>;
  PostInput: PostInput;
  PostUpdateFieldsInput: PostUpdateFieldsInput;
  PostUpdateInput: PostUpdateInput;
  PostWhereInput: PostWhereInput;
  PostsCreateInput: PostsCreateInput;
  PostsDeleteInput: PostsDeleteInput;
  PostsUpdateInput: PostsUpdateInput;
  Query: ResolverTypeWrapper<{}>;
  Role: Role;
  SignInInput: SignInInput;
  SignInWithProviderInput: SignInWithProviderInput;
  SignUpInput: SignUpInput;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  StringWhereInput: StringWhereInput;
  _User: ResolverTypeWrapper<_User>;
  _UserConnection: ResolverTypeWrapper<_UserConnection>;
  _UserCreateInput: _UserCreateInput;
  _UserDeleteInput: _UserDeleteInput;
  _UserEdge: ResolverTypeWrapper<_UserEdge>;
  _UserInput: _UserInput;
  _UserUpdateFieldsInput: _UserUpdateFieldsInput;
  _UserUpdateInput: _UserUpdateInput;
  _UserWhereInput: _UserWhereInput;
  _UsersCreateInput: _UsersCreateInput;
  _UsersDeleteInput: _UsersDeleteInput;
  _UsersUpdateInput: _UsersUpdateInput;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Address: Address;
  AddressInput: AddressInput;
  AddressUpdateFieldsInput: AddressUpdateFieldsInput;
  AddressWhereInput: AddressWhereInput;
  Any: Scalars['Any']['output'];
  AnyWhereInput: AnyWhereInput;
  Boolean: Scalars['Boolean']['output'];
  BooleanWhereInput: BooleanWhereInput;
  Date: Scalars['Date']['output'];
  DateWhereInput: DateWhereInput;
  Email: Scalars['Email']['output'];
  EmailWhereInput: EmailWhereInput;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  IntWhereInput: IntWhereInput;
  Mutation: {};
  Object: Object;
  ObjectInput: ObjectInput;
  ObjectOfObject: ObjectOfObject;
  ObjectOfObjectInput: ObjectOfObjectInput;
  ObjectOfObjectUpdateFieldsInput: ObjectOfObjectUpdateFieldsInput;
  ObjectOfObjectWhereInput: ObjectOfObjectWhereInput;
  ObjectUpdateFieldsInput: ObjectUpdateFieldsInput;
  ObjectWhereInput: ObjectWhereInput;
  Phone: Scalars['Phone']['output'];
  Post: Post;
  PostConnection: PostConnection;
  PostCreateInput: PostCreateInput;
  PostDeleteInput: PostDeleteInput;
  PostEdge: PostEdge;
  PostInput: PostInput;
  PostUpdateFieldsInput: PostUpdateFieldsInput;
  PostUpdateInput: PostUpdateInput;
  PostWhereInput: PostWhereInput;
  PostsCreateInput: PostsCreateInput;
  PostsDeleteInput: PostsDeleteInput;
  PostsUpdateInput: PostsUpdateInput;
  Query: {};
  SignInInput: SignInInput;
  SignInWithProviderInput: SignInWithProviderInput;
  SignUpInput: SignUpInput;
  String: Scalars['String']['output'];
  StringWhereInput: StringWhereInput;
  _User: _User;
  _UserConnection: _UserConnection;
  _UserCreateInput: _UserCreateInput;
  _UserDeleteInput: _UserDeleteInput;
  _UserEdge: _UserEdge;
  _UserInput: _UserInput;
  _UserUpdateFieldsInput: _UserUpdateFieldsInput;
  _UserUpdateInput: _UserUpdateInput;
  _UserWhereInput: _UserWhereInput;
  _UsersCreateInput: _UsersCreateInput;
  _UsersDeleteInput: _UsersDeleteInput;
  _UsersUpdateInput: _UsersUpdateInput;
};

export type AddressResolvers<ContextType = any, ParentType extends ResolversParentTypes['Address'] = ResolversParentTypes['Address']> = {
  address1?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  address2?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  city?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  country?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  postalCode?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface AnyScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Any'], any> {
  name: 'Any';
}

export interface DateScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Date'], any> {
  name: 'Date';
}

export interface EmailScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Email'], any> {
  name: 'Email';
}

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  createManyPost?: Resolver<ResolversTypes['PostConnection'], ParentType, ContextType, Partial<MutationCreateManyPostArgs>>;
  createMany_User?: Resolver<ResolversTypes['_UserConnection'], ParentType, ContextType, Partial<MutationCreateMany_UserArgs>>;
  createOnePost?: Resolver<ResolversTypes['Post'], ParentType, ContextType, Partial<MutationCreateOnePostArgs>>;
  createOne_User?: Resolver<ResolversTypes['_User'], ParentType, ContextType, Partial<MutationCreateOne_UserArgs>>;
  deleteManyPost?: Resolver<ResolversTypes['PostConnection'], ParentType, ContextType, Partial<MutationDeleteManyPostArgs>>;
  deleteMany_User?: Resolver<ResolversTypes['_UserConnection'], ParentType, ContextType, Partial<MutationDeleteMany_UserArgs>>;
  deleteOnePost?: Resolver<ResolversTypes['Post'], ParentType, ContextType, Partial<MutationDeleteOnePostArgs>>;
  deleteOne_User?: Resolver<ResolversTypes['_User'], ParentType, ContextType, Partial<MutationDeleteOne_UserArgs>>;
  signIn?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, Partial<MutationSignInArgs>>;
  signInWithProvider?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, Partial<MutationSignInWithProviderArgs>>;
  signUp?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, Partial<MutationSignUpArgs>>;
  updateManyPost?: Resolver<ResolversTypes['PostConnection'], ParentType, ContextType, Partial<MutationUpdateManyPostArgs>>;
  updateMany_User?: Resolver<ResolversTypes['_UserConnection'], ParentType, ContextType, Partial<MutationUpdateMany_UserArgs>>;
  updateOnePost?: Resolver<ResolversTypes['Post'], ParentType, ContextType, Partial<MutationUpdateOnePostArgs>>;
  updateOne_User?: Resolver<ResolversTypes['_User'], ParentType, ContextType, Partial<MutationUpdateOne_UserArgs>>;
};

export type ObjectResolvers<ContextType = any, ParentType extends ResolversParentTypes['Object'] = ResolversParentTypes['Object']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  objectOfObject?: Resolver<Maybe<ResolversTypes['ObjectOfObject']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type ObjectOfObjectResolvers<ContextType = any, ParentType extends ResolversParentTypes['ObjectOfObject'] = ResolversParentTypes['ObjectOfObject']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export interface PhoneScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['Phone'], any> {
  name: 'Phone';
}

export type PostResolvers<ContextType = any, ParentType extends ResolversParentTypes['Post'] = ResolversParentTypes['Post']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PostConnectionResolvers<ContextType = any, ParentType extends ResolversParentTypes['PostConnection'] = ResolversParentTypes['PostConnection']> = {
  edges?: Resolver<Maybe<Array<Maybe<ResolversTypes['PostEdge']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type PostEdgeResolvers<ContextType = any, ParentType extends ResolversParentTypes['PostEdge'] = ResolversParentTypes['PostEdge']> = {
  node?: Resolver<Maybe<ResolversTypes['Post']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  findManyPost?: Resolver<ResolversTypes['PostConnection'], ParentType, ContextType, Partial<QueryFindManyPostArgs>>;
  findMany_User?: Resolver<ResolversTypes['_UserConnection'], ParentType, ContextType, Partial<QueryFindMany_UserArgs>>;
  findOnePost?: Resolver<Maybe<ResolversTypes['Post']>, ParentType, ContextType, Partial<QueryFindOnePostArgs>>;
  findOne_User?: Resolver<Maybe<ResolversTypes['_User']>, ParentType, ContextType, Partial<QueryFindOne_UserArgs>>;
  helloWorld?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType, RequireFields<QueryHelloWorldArgs, 'name'>>;
};

export type _UserResolvers<ContextType = any, ParentType extends ResolversParentTypes['_User'] = ResolversParentTypes['_User']> = {
  accessToken?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  address?: Resolver<Maybe<ResolversTypes['Address']>, ParentType, ContextType>;
  age?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  birthDate?: Resolver<ResolversTypes['Date'], ParentType, ContextType>;
  email?: Resolver<ResolversTypes['Email'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isCool?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  object?: Resolver<Maybe<ResolversTypes['Object']>, ParentType, ContextType>;
  password?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phone?: Resolver<Maybe<ResolversTypes['Phone']>, ParentType, ContextType>;
  provider?: Resolver<Maybe<ResolversTypes['AuthenticationProvider']>, ParentType, ContextType>;
  refreshToken?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  role?: Resolver<Maybe<ResolversTypes['Role']>, ParentType, ContextType>;
  verifiedEmail?: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type _UserConnectionResolvers<ContextType = any, ParentType extends ResolversParentTypes['_UserConnection'] = ResolversParentTypes['_UserConnection']> = {
  edges?: Resolver<Maybe<Array<Maybe<ResolversTypes['_UserEdge']>>>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type _UserEdgeResolvers<ContextType = any, ParentType extends ResolversParentTypes['_UserEdge'] = ResolversParentTypes['_UserEdge']> = {
  node?: Resolver<Maybe<ResolversTypes['_User']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  Address?: AddressResolvers<ContextType>;
  Any?: GraphQLScalarType;
  Date?: GraphQLScalarType;
  Email?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Object?: ObjectResolvers<ContextType>;
  ObjectOfObject?: ObjectOfObjectResolvers<ContextType>;
  Phone?: GraphQLScalarType;
  Post?: PostResolvers<ContextType>;
  PostConnection?: PostConnectionResolvers<ContextType>;
  PostEdge?: PostEdgeResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  _User?: _UserResolvers<ContextType>;
  _UserConnection?: _UserConnectionResolvers<ContextType>;
  _UserEdge?: _UserEdgeResolvers<ContextType>;
};



export type WibeSchemaScalars = "Phone"

export type WibeSchemaEnums = "Role" | "AuthenticationProvider"

export type WibeSchemaTypes = {
	Post: Post,
	_User: _User
}