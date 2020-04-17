const fs = require('fs')
const moment = require('moment')

/**
 * @param {Object} req Request HTTP Object
 * @param {Object} res Response HTTP Object
 * @param {string} path Path to use as Image Mailbox
 */

const writeFile = (path, deviceName, file) => {
	return new Promise((resolve, reject) => {
		let fileExists = false
		let fi = 0

		let fileType, fileWritePath

		if (file.type === 'pdf') {
			fileType = 'pdf'
		} else if (file.type === 'vnd.openxmlformats-officedocument.wordprocessingml.document') {
			fileType = 'docx'
		}

		if (fs.existsSync(`${path}/${deviceName}/${file.filename}.${fileType}`)) {
			fileExists = true
		} else {
			fileWritePath = `${path}/${deviceName}/${file.filename}.${fileType}`
		}

		while (fileExists) {
			fi++
			if (!fs.existsSync(`${path}/${deviceName}/${file.filename}[${fi}].${fileType}`)) {
				fileExists = false
				fileWritePath = `${path}/${deviceName}/${file.filename}[${fi}].${fileType}`
			}
		}

		fs.writeFile(fileWritePath, file.buffer, (err) => {
			if (err) {
				console.error(err)
				reject(err)
			} else {
				resolve()
			}
		})
	})
}

const saveFile = (req, res, path) => {
	return new Promise((resolve, reject) => {
		if (req.headers['content-type'].split('/')[0] === 'application') {
			const file = {
				type: req.headers['content-type'].split('/')[1],
				device: req.headers.device,
				filename: req.headers.filename,
				buffer: req.body
			}

			let deviceName = file.device
			if (!deviceName) {
				deviceName = 'UnknownDevice'
			}

			if (!fs.existsSync(`${path}/${deviceName}`)) {
				fs.mkdir(`${path}/${deviceName}`, { recursive: true }, (err) => {
					if (err) {
						console.error(err)
						reject(err)
					} else {
						console.log('Folder created for device!')
						writeFile(path, deviceName, file).then(() => {
							res.send('file received')
							resolve()
						}).catch((err) => {
							reject(err)
						})
					}
				})
			} else {
				writeFile(path, deviceName, file).then(() => {
					res.send('File received')
					resolve()
				}).catch((err) => {
					reject(err)
				})
			}
		} else {
			res.status(400).send()
			reject(new Error('Invalid Headers. Probably not an image'))
		}
	})
}

module.exports = saveFile
