const fs = require('fs')
const moment = require('moment')

/**
 * @param {Object} req Request HTTP Object
 * @param {Object} res Response HTTP Object
 * @param {string} path Path to use as Image Mailbox
 */

const writeFile = (path, deviceName, datetime, media) => {
	return new Promise((resolve, reject) => {
		let fileExists = false
		let fi = 0

		let imageWritePath
		let fileName = `${media.contentType}${datetime}.${media.type}`

		if (fs.existsSync(`${path}\\${deviceName}\\${fileName}`)) {
			fileExists = true
		} else {
			imageWritePath = `${path}\\${deviceName}\\${fileName}`
		}

		while (fileExists) {
			fi++
			fileName = `${media.contentType}${datetime}[${fi}].${media.type}`
			if (!fs.existsSync(`${path}\\${deviceName}\\${fileName}`)) {
				fileExists = false
				imageWritePath = `${path}\\${deviceName}\\${fileName}`
			}
		}

		fs.writeFile(imageWritePath, media.buffer, (err) => {
			if (err) {
				console.error(err)
				reject(err)
			} else {
				resolve({ fileName: fileName.split('.')[0], path: imageWritePath })
			}
		})
	})
}

const saveMedia = (req, res, imagesPath, videosPath) => {
	return new Promise((resolve, reject) => {
		const contentType = req.headers['content-type'].split('/')[0]

		const media = {
			contentType: contentType,
			type: req.headers['content-type'].split('/')[1],
			device: req.headers.device,
			datetime: moment(req.headers.datetime),
			buffer: req.body
		}

		let deviceName = media.device
		if (!deviceName) {
			deviceName = 'UnknownDevice'
		}

		const datetime = `${media.datetime.format('YYYY-MM-DD')}T${media.datetime.format('HHmmss')}`

		if (contentType === 'image') {
			if (!fs.existsSync(`${imagesPath}/${deviceName}`)) {
				fs.mkdir(`${imagesPath}/${deviceName}`, { recursive: true }, (err) => {
					if (err) {
						console.error(err)
						reject(err)
					} else {
						console.log('Folder created for device!')
						writeFile(imagesPath, deviceName, datetime, media).then(result => {
							res.send('Image received')
							resolve({ fileName: result.fileName, path: result.path })
						}).catch((err) => {
							reject(err)
						})
					}
				})
			} else {
				writeFile(imagesPath, deviceName, datetime, media).then(result => {
					res.send('Image received')
					resolve({ fileName: result.fileName, path: result.path })
				}).catch((err) => {
					reject(err)
				})
			}
		} else if (contentType === 'video') {
			if (!fs.existsSync(`${videosPath}/${deviceName}`)) {
				fs.mkdir(`${videosPath}/${deviceName}`, { recursive: true }, (err) => {
					if (err) {
						console.error(err)
						reject(err)
					} else {
						console.log('Folder created for device!')
						writeFile(videosPath, deviceName, datetime, media).then(result => {
							res.send('Video received')
							resolve({ fileName: result.fileName, path: result.path })
						}).catch((err) => {
							reject(err)
						})
					}
				})
			} else {
				writeFile(videosPath, deviceName, datetime, media).then(result => {
					res.send('Video received')
					resolve({ fileName: result.fileName, path: result.path })
				}).catch((err) => {
					reject(err)
				})
			}
		} else {
			res.status(400).send()
			reject(new ReferenceError('Invalid Headers. Probably not a media file'))
		}
	})
}

module.exports = saveMedia
