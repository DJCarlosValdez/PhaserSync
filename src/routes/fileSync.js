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

		let fileWritePath
		let fileType = file.type
		if (fileType === 'vnd.openxmlformats-officedocument.wordprocessingml.document') {
			fileType = 'docx'
		} else if (fileType === 'vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
			fileType = 'xlsx'
		} else if (fileType === 'vnd.openxmlformats-officedocument.presentationml.presentation') {
			fileType = 'pptx'
		} else {
			console.log('File type: ', fileType)
		}

		let fileName = `${file.filename}.${fileType}`

		if (fs.existsSync(`${path}\\${deviceName}\\${fileName}`)) {
			fileExists = true
		} else {
			fileWritePath = `${path}\\${deviceName}\\${fileName}`
		}

		while (fileExists) {
			fi++
			fileName = `${file.filename}[${fi}].${fileType}`
			if (!fs.existsSync(`${path}\\${deviceName}\\${fileName}`)) {
				fileExists = false
				fileWritePath = `${path}\\${deviceName}\\${fileName}`
			}
		}

		fs.writeFile(fileWritePath, file.buffer, (err) => {
			if (err) {
				console.error(err)
				reject(err)
			} else {
				resolve({ fileName: fileName.split('.')[0], path: fileWritePath })
			}
		})
	})
}

const saveFile = (req, res, path) => {
	return new Promise((resolve, reject) => {
		const contentType = req.headers['content-type'].split('/')[0]

		const file = {
			contentType: contentType,
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
					writeFile(path, deviceName, file).then(result => {
						res.send('file received')
						resolve({ fileName: result.fileName, path: result.path })
					}).catch((err) => {
						reject(err)
					})
				}
			})
		} else {
			writeFile(path, deviceName, file).then(result => {
				res.send('File received')
				resolve({ fileName: result.fileName, path: result.path })
			}).catch((err) => {
				reject(err)
			})
		}
	})
}

module.exports = saveFile
