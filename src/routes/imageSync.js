const fs = require('fs')
const moment = require('moment')

/**
 * @param {Object} req Request HTTP Object
 * @param {Object} res Response HTTP Object
 * @param {string} path Path to use as Image Mailbox
 */

const writeFile = (path, deviceName, datetime, image) => {
	return new Promise((resolve, reject) => {
		let fileExists = false
		let fi = 0

		let imageWritePath

		if (fs.existsSync(`${path}/${deviceName}/image${datetime}.${image.type}`)) {
			fileExists = true
		} else {
			imageWritePath = `${path}/${deviceName}/image${datetime}.${image.type}`
		}

		while (fileExists) {
			fi++
			if (!fs.existsSync(`${path}/${deviceName}/image${datetime}[${fi}].${image.type}`)) {
				fileExists = false
				imageWritePath = `${path}/${deviceName}/image${datetime}[${fi}].${image.type}`
			}
		}

		fs.writeFile(imageWritePath, image.buffer, (err) => {
			if (err) {
				console.error(err)
				reject(err)
			} else {
				resolve()
			}
		})
	})
}

const saveImage = (req, res, path) => {
	return new Promise((resolve, reject) => {
		if (req.headers['content-type'].split('/')[0] === 'image') {
			const image = {
				type: req.headers['content-type'].split('/')[1],
				device: req.headers.device,
				datetime: moment(req.headers['image-datetime']),
				buffer: req.body
			}

			let deviceName = image.device
			if (!deviceName) {
				deviceName = 'UnknownDevice'
			}

			const datetime = `${image.datetime.format('YYYY-MM-DD')}T${image.datetime.format('HHmmss')}`

			if (!fs.existsSync(`${path}/${deviceName}`)) {
				fs.mkdir(`${path}/${deviceName}`, { recursive: true }, (err) => {
					if (err) {
						console.error(err)
						reject(err)
					} else {
						console.log('Folder created for device!')
						writeFile(path, deviceName, datetime, image).then(() => {
							res.send('Image received')
							resolve()
						}).catch((err) => {
							reject(err)
						})
					}
				})
			} else {
				writeFile(path, deviceName, datetime, image).then(() => {
					res.send('Image received')
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

module.exports = saveImage
