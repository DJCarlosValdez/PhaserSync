const electron = require('electron')
const { app, dialog, BrowserWindow, Menu, Tray, ipcMain, shell } = electron
const fs = require('fs')
const internalIP = require('internal-ip')
// const moment = require('moment')
const express = require('express')
const server = express()

const qrcode = require('qrcode')

// Request Handlers
const mediaSync = require('./routes/mediaSync')
const fileSync = require('./routes/fileSync')

if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
	app.quit()
}

const bodyParser = require('body-parser')

server.use(bodyParser.raw({
	type: 'image/*',
	limit: '50mb'
}))

server.use(bodyParser.raw({
	type: 'application/*',
	limit: '20mb'
}))

server.use(bodyParser.raw({
	type: 'audio/*',
	limit: '50mb'
}))

server.use(bodyParser.raw({
	type: 'video/*',
	limit: '100mb'
}))

server.use(bodyParser.text())

let mainWindow, tray
let settings, ip
let files = []
/**
 * @param {('setup'|'server')} screen The screen to create
 */
const createWindow = (screen) => {
	return new Promise((resolve, reject) => {
		const display = electron.screen.getPrimaryDisplay()
		const displayWidth = display.bounds.width
		const displayHeight = display.bounds.height

		let settings = {
			width: 1050,
			height: 800,
			show: true,
			frame: false,
			resizable: false,
			fullscreenable: false,
			webPreferences: {
				nodeIntegration: true
			}
		}

		if (screen === 'server') {
			settings = {
				width: 400,
				height: 450,
				x: displayWidth - 400,
				y: displayHeight - 450,
				movable: false,
				show: true,
				frame: false,
				fullscreenable: false,
				resizable: false,
				webPreferences: {
					nodeIntegration: true
				}
			}
		}

		mainWindow = new BrowserWindow(settings)

		if (screen === 'setup') {
			mainWindow.loadURL(`file://${__dirname}/setup.html`)
		} else if (screen === 'server') {
			mainWindow.loadURL(`file://${__dirname}/main.html`)
			// Uncomment when you finally fixed the code - Probably never...
			// windowOutside()
		}

		mainWindow.on('closed', () => {
			mainWindow = null
		})

		resolve()
	})
}

const createTray = () => {
	tray = new Tray(`${__dirname}/icon.png`)
	const contextMenu = Menu.buildFromTemplate([
		{ label: 'Quit', type: 'normal', role: 'quit' }
	])
	tray.setContextMenu(contextMenu)
	tray.setToolTip('PhaserSync')
	tray.on('click', event => {
		toggleWindow()
	})
}

const toggleWindow = () => {
	mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()
}

const windowOutside = () => {
	mainWindow.on('blur', () => {
		mainWindow.hide()
	})
}

const generateRandomCode = (() => {
	const USABLE_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')

	return length => {
		return new Array(length).fill(null).map(() => {
			return USABLE_CHARACTERS[Math.floor(Math.random() * USABLE_CHARACTERS.length)]
		}).join('')
	}
})()

const startServer = (createWin) => {
	server.listen({
		port: settings.network.port,
		host: ip
	}, () => {
		console.log('PhaserSync Server Booted Up!')

		if (createWin) {
			createWindow('server').then(() => {
				createTray()
			})
		}
	})
}

const generateSVGQR = () => {
	let qr
	qrcode.toString(`http://${ip}:${settings.network.port}`, { type: 'svg' }, (err, code) => {
		if (err) {
			console.error(err)
		} else {
			qr = code
		}
	})

	return qr
}

// ELECTRON APP EVENT LISTENERS

app.on('ready', () => {
	ip = internalIP.v4.sync()

	if (fs.existsSync(`${__dirname}/settings.json`)) {
		const dataJSON = fs.readFileSync(`${__dirname}/settings.json`)
		settings = JSON.parse(dataJSON)
		startServer(true)
	} else {
		createWindow('setup')
	}
})

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') {
		app.quit()
	}
})

app.on('activate', () => {
	if (mainWindow === null) {
		createWindow()
	}
})

// API ENDPOINTS

let bolt = false
let portal = true

server.post('/sendmedia', (req, res) => {
	if (portal) {
		const contentType = req.headers['content-type'].split('/')[0]

		if (contentType === 'image' || contentType === 'video') {
			const file = {
				contentType: contentType,
				type: req.headers['content-type'].split('/')[1],
				device: req.headers.device,
				id: `file${generateRandomCode(8)}`,
				req: req,
				res: res,
				fileName: undefined,
				path: undefined
			}

			if (!file.device) {
				file.device = 'UnknownDevice'
			}

			if (bolt) {
				mediaSync(req, res, settings.paths.images, settings.paths.videos).then(result => {
					file.fileName = result.fileName
					file.path = result.path
					files.push(file)
					mainWindow.webContents.send('createDownload', file)
					console.log('Media Saved!')
				}).catch(err => {
					console.error(err)
				})
			} else {
				files.push(file)
				mainWindow.webContents.send('requestDownload', file)
			}
		} else {
			res.status(400).send('Invalid Content Type')
		}
	} else {
		res.status(401).send('Data portal closed')
	}
})

server.post('/sendfile', (req, res) => {
	if (portal) {
		const contentType = req.headers['content-type'].split('/')[0]

		if (contentType === 'application' || contentType === 'audio') {
			const file = {
				contentType: contentType,
				type: req.headers['content-type'].split('/')[1],
				device: req.headers.device,
				id: `file${generateRandomCode(8)}`,
				req: req,
				res: res,
				fileName: undefined,
				path: undefined
			}

			if (!file.device) {
				file.device = 'UnknownDevice'
			}

			if (bolt) {
				fileSync(req, res, settings.paths.files).then(result => {
					file.fileName = result.fileName
					file.path = result.path
					files.push(file)
					mainWindow.webContents.send('createDownload', file)
					console.log('File Saved!')
				}).catch(err => {
					console.error(err)
				})
			} else {
				files.push(file)
				mainWindow.webContents.send('requestDownload', file)
			}
		} else {
			res.status(400).send('Invalid Content Type')
		}
	} else {
		res.status(401).send('Data portal closed')
	}
})

server.post('/test', (req, res) => {
	console.log(req.body)
	const contentType = req.headers['content-type'].split('/')[0]
	console.log(contentType)
	res.send('Hello World!')
})

// ELECTRON HANDLERS

ipcMain.on('createSettingsFile', (event, args) => {
	console.log(args)
	fs.writeFile(`${__dirname}/settings.json`, JSON.stringify(args), (err) => {
		if (err) {
			console.error(err)
		} else {
			console.log('Settings file created')
			settings = args
		}
	})
})

ipcMain.on('killSetupScreen', (event, args) => {
	mainWindow.hide()
	startServer(true)
})

ipcMain.on('chooseDirectory', (event, args) => {
	dialog.showOpenDialog(mainWindow, {
		properties: ['openDirectory', 'promptToCreate']
	}).then(e => {
		if (e.filePaths) {
			event.reply('inputPath', e.filePaths[0])
		}
	})
})

ipcMain.on('loadSettingsReq', (e) => {
	if (settings) {
		e.reply('loadSettingsRes', [settings, ip, generateSVGQR()])
	}
})

ipcMain.on('generateQR', (e, args) => {
	e.reply('receiveQR', generateSVGQR())
})

ipcMain.on('toggleBolt', () => {
	if (bolt) {
		bolt = false
	} else {
		bolt = true
	}
})

ipcMain.on('togglePortal', () => {
	if (portal) {
		portal = false
	} else {
		portal = true
	}
})

ipcMain.on('allowDownload', (e, args) => {
	if (args) {
		console.log('File download allowed: ', args)
		const query = files.find(file => {
			return file.id === args
		})

		if (query) {
			const index = files.findIndex(file => file.id === query.id)
			if (query.contentType === 'image' || query.contentType === 'video') {
				mediaSync(query.req, query.res, settings.paths.images, settings.paths.videos).then(result => {
					files[index].fileName = result.fileName
					files[index].path = result.path

					console.log('Media Saved')
					mainWindow.webContents.send('downloadFinish', { id: query.id, fileName: result.fileName })
				}).catch(err => {
					console.error(err)
				})
			} else if (query.contentType === 'application' || query.contentType === 'audio') {
				fileSync(query.req, query.res, settings.paths.files).then(result => {
					files[index].fileName = result.fileName
					files[index].path = result.path

					console.log('Media Saved')
					mainWindow.webContents.send('downloadFinish', { id: query.id, fileName: result.fileName })
				}).catch(err => {
					console.error(err)
				})
			}
		}
	}
})

ipcMain.on('denyDownload', (e, args) => {
	if (args) {
		console.log('File download denied: ', args)
		const query = files.find(file => {
			return file.id === args
		})

		if (query) {
			query.res.status(401).send('Host denied the file!')

			files = files.filter(file => {
				return file.id !== query.id
			})
		}
	}
})

ipcMain.on('removeFileInList', (e, id) => {
	if (id) {
		const query = files.find(file => {
			return file.id === id
		})

		if (query) {
			files = files.filter(file => {
				return file.id !== query.id
			})
		}
	}
})

ipcMain.on('showFolder', (e, args) => {
	if (args) {
		const query = files.find(file => {
			return file.id === args
		})

		if (query) {
			if (fs.existsSync(query.path)) {
				shell.showItemInFolder(query.path)
			}
		}
	}
})

// THIS AMAZING CODE WAS CREATED BY Carlos Valdez! Wuuuuu give lots of love to this guy!
// carlosvaldez.com.mx
