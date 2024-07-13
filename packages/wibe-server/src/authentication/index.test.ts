import { afterAll, afterEach, beforeAll, describe, expect, it } from 'bun:test'
import { type GraphQLClient, gql } from 'graphql-request'
import type { WibeApp } from '..'
import {
	type DevWibeAppTypes,
	closeTests,
	getAnonymousClient,
	getGraphqlClient,
	getUserClient,
	setupTests,
} from '../utils/helper'

const createUserAndUpdateRole = async ({
	anonymousClient,
	rootClient,
	roleName,
	port,
}: {
	port: number
	anonymousClient: GraphQLClient
	rootClient: GraphQLClient
	roleName: string
}) => {
	const res = await anonymousClient.request<any>(graphql.signUpWith, {
		input: {
			authentication: {
				emailPassword: {
					email: 'email@test.fr',
					password: 'password',
				},
			},
		},
	})

	const resOfRoles = await rootClient.request<any>(gql`
			query getRoles {
					roles(where: {name: {equalTo: "${roleName}"}}) {
			    edges {
		    			node {
		     			 	id
		    			}
		  			}
					}
			}
		`)

	const roleId = resOfRoles.roles.edges[0].node.id

	await rootClient.request<any>(gql`
			mutation updateUser {
			  updateUser(input: {id: "${res.signUpWith.id}", fields: {role: {link: "${roleId}"}}}) {
		  			user {
		    			id
		  			}
					}
			}
		`)

	const userClient = getUserClient(port, res.signUpWith.accessToken)

	return {
		userClient,
		roleId,
		userId: res.signUpWith.id,
		accessToken: res.signUpWith.accessToken,
		refreshToken: res.signUpWith.refreshToken,
	}
}

describe('Authentication', () => {
	let wibe: WibeApp<DevWibeAppTypes>
	let port: number
	let client: GraphQLClient
	let rootClient: GraphQLClient

	beforeAll(async () => {
		const setup = await setupTests()
		wibe = setup.wibe
		port = setup.port
		client = getAnonymousClient(port)
		rootClient = getGraphqlClient(port)
	})

	afterAll(async () => {
		await closeTests(wibe)
	})

	afterEach(async () => {
		await rootClient.request<any>(graphql.deleteUsers)
		await rootClient.request<any>(graphql.deleteTests)
	})

	// it.only('should connect an user when he is created with createUser mutation', async () => {
	// 	const res = await rootClient.request<any>(gql`
	// 		mutation createUser{
	// 			createUser(input:{fields: {authentication: {emailPassword: {email:"test@gmail.com", password: "password"}}}}){
	// 				user {
	// 					id
	// 					sessions {
	// 						edges {
	// 							node {
	// 								id
	// 								accessToken
	// 							}
	// 						}
	// 					}
	// 				}
	// 			}
	// 		}`)

	// 	console.log(res.createUser.user.sessions)
	// })

	it('should not authorize an user to read an object when the user has not access on read to the object (ACL)', async () => {
		const { userClient, userId } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const objectCreated = await rootClient.request<any>(gql`
				mutation createTest {
					createTest(input:{fields:{name: "test"}}){
						test{
							id
						}
					}
				}
		`)

		const objectId = objectCreated.createTest.test.id

		await rootClient.request<any>(gql`
			mutation updateACL{
				updateTest(input:{id: "${objectId}", fields: {acl:{
					users: [{
						userId: "${userId}",
						read: false,
						write: true
					}]
				}}}){
					test{
						id
					}
				}
			}
		`)

		const res = await userClient.request<any>(gql`
				query tests{
					tests{
						edges {
							node {
								id
							}
						}
					}
				}
			`)

		expect(res.tests.edges.length).toEqual(0)
	})

	it('should not authorize an user to write (delete) an object when the user has not access on write to the object (ACL)', async () => {
		const { userClient, userId } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const objectCreated = await rootClient.request<any>(gql`
				mutation createTest {
					createTest(input:{fields:{name: "test"}}){
						test{
							id
						}
					}
				}
		`)

		const objectId = objectCreated.createTest.test.id

		await rootClient.request<any>(gql`
			mutation updateACL{
				updateTest(input:{id: "${objectId}", fields: {acl:{
					users: [{
						userId: "${userId}",
						read: true,
						write: false
					}]
				}}}){
					test{
						id
					}
				}
			}
		`)

		expect(
			userClient.request<any>(gql`
				mutation deleteTest{
					deleteTest(input:{id: "${objectId}"}){
						test{
							id
						}
					}
				}
			`),
		).rejects.toThrow('Object not found')
	})

	it('should not authorize an user to get the result of mutation (read) when he has access on write but not on read (ACL)', async () => {
		const { userClient, userId } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const objectCreated = await rootClient.request<any>(gql`
				mutation createTest {
					createTest(input:{fields:{name: "test"}}){
						test{
							id
						}
					}
				}
		`)

		const objectId = objectCreated.createTest.test.id

		await rootClient.request<any>(gql`
			mutation updateACL{
				updateTest(input:{id: "${objectId}", fields: {acl:{
					users: [{
						userId: "${userId}",
						read: false,
						write: true
					}]
				}}}){
					test{
						id
					}
				}
			}
		`)

		expect(
			userClient.request<any>(gql`
				mutation updateTest{
					updateTest(input:{id: "${objectId}", fields : {name: "tata"}}){
						test{
							id
						}
					}
				}
			`),
		).rejects.toThrow('Object not found')
	})

	it('should not authorize an user to write (update) an object when the user has not access on write to the object (ACL)', async () => {
		const { userClient, userId } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const objectCreated = await rootClient.request<any>(gql`
				mutation createTest {
					createTest(input:{fields:{name: "test"}}){
						test{
							id
						}
					}
				}
		`)

		const objectId = objectCreated.createTest.test.id

		await rootClient.request<any>(gql`
			mutation updateACL{
				updateTest(input:{id: "${objectId}", fields: {acl:{
					users: [{
						userId: "${userId}",
						read: true,
						write: false
					}]
				}}}){
					test{
						id
					}
				}
			}
		`)

		expect(
			userClient.request<any>(gql`
				mutation updateTest{
					updateTest(input:{id: "${objectId}", fields : {name: "tata"}}){
						test{
							id
						}
					}
				}
			`),
		).rejects.toThrow('Object not found')
	})

	it('should authorize an user to read an object when the user has access on read to the object (ACL)', async () => {
		const { userClient, userId } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const objectCreated = await rootClient.request<any>(gql`
				mutation createTest {
					createTest(input:{fields:{name: "test"}}){
						test{
							id
						}
					}
				}
		`)

		const objectId = objectCreated.createTest.test.id

		await rootClient.request<any>(gql`
			mutation updateACL{
				updateTest(input:{id: "${objectId}", fields: {acl:{
					users: [{
						userId: "${userId}",
						read: true,
						write: false
					}]
				}}}){
					test{
						id
					}
				}
			}
		`)

		const res = await userClient.request<any>(gql`
				query tests{
					tests{
						edges {
							node {
								id
							}
						}
					}
				}
			`)

		expect(res.tests.edges.length).toEqual(1)
	})

	it('should not authorize to delete an object when an ACL protect the object on write for this role (ACL)', async () => {
		const { userClient, roleId } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const objectCreated = await rootClient.request<any>(gql`
				mutation createTest {
					createTest(input:{fields:{name: "test"}}){
						test{
							id
						}
					}
				}
		`)

		const objectId = objectCreated.createTest.test.id

		await rootClient.request<any>(gql`
			mutation updateACL{
				updateTest(input:{id: "${objectId}", fields: {acl:{
					roles: [{
						roleId: "${roleId}",
						read: true,
						write: false
					}]
				}}}){
					test{
						id
					}
				}
			}
		`)

		expect(
			userClient.request<any>(gql`
				mutation deleteTest{
					deleteTest(input: {id: "${objectId}"}){
						test {
							id
						}
					}
				}
			`),
		).rejects.toThrow('Object not found')
	})

	it('should not authorize to update an object when an ACL protect the object on write for this role (ACL)', async () => {
		const { userClient, roleId } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const objectCreated = await rootClient.request<any>(gql`
				mutation createTest {
					createTest(input:{fields:{name: "test"}}){
						test{
							id
						}
					}
				}
		`)

		const objectId = objectCreated.createTest.test.id

		await rootClient.request<any>(gql`
			mutation updateACL{
				updateTest(input:{id: "${objectId}", fields: {acl:{
					roles: [{
						roleId: "${roleId}",
						read: true,
						write: false
					}]
				}}}){
					test{
						id
					}
				}
			}
		`)

		expect(
			userClient.request<any>(gql`
				mutation updateTest{
					updateTest(input: {id: "${objectId}", fields:{name: "tata"}}){
						test {
							id
						}
					}
				}
			`),
		).rejects.toThrow('Object not found')
	})

	it('should not authorize to read an object when an ACL protect the object on read for this role (ACL)', async () => {
		const { userClient, roleId } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const objectCreated = await rootClient.request<any>(gql`
				mutation createTest {
					createTest(input:{fields:{name: "test"}}){
						test{
							id
						}
					}
				}
		`)

		const objectId = objectCreated.createTest.test.id

		await rootClient.request<any>(gql`
			mutation updateACL{
				updateTest(input:{id: "${objectId}", fields: {acl:{
					roles: [{
						roleId: "${roleId}",
						read: false,
						write:true
					}]
				}}}){
					test{
						id
					}
				}
			}		
		`)

		const res = await userClient.request<any>(gql`
				query tests{
					tests{
						edges{
							node{
								id
							}
						}
					}
				}
			`)

		expect(res.tests.edges.length).toEqual(0)
	})

	// Class Level Permissions

	it('should not authorize an user to create an object another class with target when the user do not have access to write the other class with (CLP)', async () => {
		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client2',
			rootClient,
		})

		expect(
			userClient.request<any>(gql`
				mutation createTest {
					createTest(input:{fields:{name: "test", pointer: {createAndLink: {name: "tata"}}}}){
						test{
							id
							pointer {
								id
							}
						}
					}
				}
		`),
		).rejects.toThrow('Permission denied to create class Test2')
	})

	it.only('should not authorize an user to read an object on another class with pointer when the user do not have access to read the other class with (CLP)', async () => {
		const { userClient, userId } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const objectCreated = await rootClient.request<any>(gql`
				mutation createTest {
					createTest(input:{fields:{name: "test", pointer: {createAndLink: {name: "tata"}}}}){
						test{
							id
							pointer {
								id
							}
						}
					}
				}
		`)

		const pointerId = objectCreated.createTest.test.pointer.id

		await rootClient.request<any>(gql`
			mutation updateACL{
				updateTest2(input:{id: "${pointerId}", fields: {acl:{
					users: [{
						userId: "${userId}",
						read: false,
						write: false
					}]
				}}}){
					test2{
						id
					}
				}
			}
		`)

		expect(
			userClient.request<any>(gql`
				query tests{
					tests{
						edges {
							node {
								id
								name
								pointer {
									id
								}
							}
						}
					}
				}
			`),
		).rejects.toThrow('Permission denied to read class Test2')
	})

	it('should authorize a connected user to access to a protected resource', async () => {
		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client',
			rootClient,
		})

		const resOfTest = await userClient.request<any>(gql`
			query tests{
				tests {
					edges {
						node {
							id
						}
					}
				}
			}
		`)

		expect(resOfTest.tests.edges.length).toEqual(0)
	})

	it('should authorize a connected user to access to protected resource after the user refresh his token', async () => {
		const { userClient, refreshToken, accessToken } =
			await createUserAndUpdateRole({
				anonymousClient: client,
				port,
				roleName: 'Client',
				rootClient,
			})

		const resAfterRefresh = await userClient.request<any>(graphql.refresh, {
			input: {
				accessToken,
				refreshToken,
			},
		})

		const userClientAfterRefresh = getUserClient(
			port,
			resAfterRefresh.refresh.accessToken,
		)

		const resOfTest = await userClientAfterRefresh.request<any>(gql`
			query tests{
				tests {
					edges {
						node {
							id
						}
					}
				}
			}
		`)

		expect(resOfTest.tests.edges.length).toEqual(0)
	})

	it('should not authorize to access to protected resource if the user is not connected', async () => {
		await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client3',
			rootClient,
		})

		const userClient = getUserClient(port, 'invalidToken')

		expect(
			userClient.request<any>(gql`
			query tests{
				tests {
					edges {
						node {
							id
						}
					}
				}
			}
		`),
		).rejects.toThrow('Permission denied to read class Test')
	})

	it("should not authorize to access to protected resource if the user doesn't had an authorized role", async () => {
		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client3',
			rootClient,
		})

		expect(
			userClient.request<any>(gql`
			query tests{
				tests {
					edges {
						node {
							id
						}
					}
				}
			}
		`),
		).rejects.toThrow('Permission denied to read class Test')
	})

	it('should not authorize to delete a test object to an user that have the right to read the same class', async () => {
		const { userClient } = await createUserAndUpdateRole({
			anonymousClient: client,
			port,
			roleName: 'Client2',
			rootClient,
		})

		await rootClient.request<any>(gql`
				mutation createTest{
					createTest(input: {fields: {name: "test"}}){
						test{
							id
						}
					}
				}
			`)

		expect(
			userClient.request<any>(gql`
			mutation deleteTests{
				deleteTests(input: {where: {name: {equalTo: "test"}}}) {
					edges {
						node {
							id
						}
					}
				}
			}
		`),
		).rejects.toThrow('Permission denied to delete class Test')
	})
})

const graphql = {
	deleteTests: gql`
		mutation deleteTests {
  		deleteTests(
    		input: {where: {name: {equalTo: "test"}}}
  		) {
    		edges {
      		node {
        		id
      		}
    		}
  		}
		}
	`,
	deleteUsers: gql`
		mutation deleteUser {
  		deleteUsers(
    		input: {where: {authentication: {emailPassword: {email: {equalTo: "email@test.fr"}}}}}
  		) {
    		edges {
      		node {
        		id
      		}
    		}
  		}
		}
	`,
	signInWith: gql`
		 mutation signInWith($input: SignInWithInput!) {
  		signInWith(input: $input){
  			id
  			accessToken
  			refreshToken
  		}
		}
	`,
	signUpWith: gql`
		 mutation signUpWith($input: SignUpWithInput!) {
  		signUpWith(input:	$input){
  			id
  			accessToken
  			refreshToken
  		}
  	}
	 `,
	signOut: gql`
		 mutation signOut {
			signOut
		}
	`,
	refresh: gql`
		mutation refresh($input: RefreshInput) {
  		refresh(input: $input) {
    		accessToken
    		refreshToken
  		}
		}
	`,
}
