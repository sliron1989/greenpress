const { Types: { ObjectId } } = require('mongoose')
const User = require('../models/user')
const UsersService = require('../services/users')
const { isObjectId } = require('../../helpers/mongo-utils')

const privilegedUserFields = 'email name roles'

function getUsers(req, res) {
	const isPrivileged = !!(req.userPayload && req.userPayload.isPrivileged)

	const users = (req.query.users || '')
		.split(',')
		.map(id => {
			const val = id.trim()
			if (isObjectId(val)) {
				return ObjectId(val)
			}
			return false
		})
		.filter(Boolean)

	if (!(isPrivileged || users.length)) {
		return res.status(200).json([]).end()
	}

	const query = isPrivileged && !users.length ? {} : { _id: { $in: users } }
	query.tenant = req.headers.tenant

	return User.find(query)
		.select(isPrivileged ? privilegedUserFields : 'name')
		.lean()
		.then(users => {
			return res.status(200).json(users || []).end()
		})
		.catch(() => res.status(404).json({ message: 'could not load users' }).end())
}

function getUser(req, res) {
	const isPrivileged = !!(req.userPayload && req.userPayload.isPrivileged)

	return User.findOne({ _id: req.params.userId, tenant: req.headers.tenant })
		.select(isPrivileged ? privilegedUserFields : 'name')
		.lean()
		.then(user => {
			if (!user) {
				return Promise.reject(null)
			}
			return res.status(200).json(user).end()
		})
		.catch(() => res.status(404).json({ message: 'user not exists' }).end())
}

async function createUser(req, res) {
	const user = new User(req.body)
	user.tenant = req.headers.tenant

	try {
		const { _id, name, email, roles } = await user.save()
		res.status(200).json({ _id, name, email, roles }).end()
	} catch (e) {
		res.status(400).json({ message: 'user creation failed' }).end()
	}
}

async function updateUser(req, res) {
	const { email, roles, name, password } = req.body || {}

	try {
		await UsersService.updateUser(
			{ _id: req.params.userId, tenant: req.headers.tenant },
			{ email, roles, name, password }
		)
		res.status(200).json({ email, name, roles, _id: req.params.userId }).end()
	} catch (e) {
		res.status(400).json({ message: 'user update failed' }).end()
	}
}

async function removeUser(req, res) {
	try {
		await UsersService.deleteUser(req.params.userId, req.headers.tenant);
		res.status(200).json({ _id: req.params.userId }).end()
	} catch (e) {
		res.status(400).json({ message: 'user deletion failed' }).end()
	}
}

module.exports = {
	getUsers,
	createUser,
	getUser,
	updateUser,
	removeUser,
}
