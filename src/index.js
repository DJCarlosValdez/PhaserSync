const electron = require('electron')
const { app, dialog, BrowserWindow, Menu, Tray, ipcMain } = electron
const fs = require('fs')
const internalIP = require('internal-ip')
// const moment = require('moment')
const express = require('express')
const server = express()

const qrcode = require('qrcode')

// Request Handlers
const imageSync = require('./routes/imageSync')
const fileSync = require('./routes/fileSync')

if (require('electron-squirrel-startup')) { // eslint-disable-line global-require
	app.quit()
}

const bodyParser = require('body-parser')
server.use(bodyParser.raw({
	type: '*/*',
	limit: '100mb'
}))
server.use(bodyParser.text())

let mainWindow, tray
let settings, ip

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
				width: 300,
				height: 400,
				x: displayWidth - 300,
				y: displayHeight - 400,
				movable: false,
				show: false,
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

const startServer = () => {
	server.listen({
		port: settings.network.port,
		host: ip
	}, () => {
		console.log('PhaserSync Server Booted Up!')

		createWindow('server').then(() => {
			createTray()
			qrcode.toString(`http://${ip}:${settings.network.port}`, { type: 'terminal' }, (err, string) => {
				if (err) {
					console.error(err)
				} else {
					console.log(string)
				}
			})
		})
	})
}

// ELECTRON APP EVENT LISTENERS

app.on('ready', () => {
	if (fs.existsSync(`${__dirname}/settings.json`)) {
		const dataJSON = fs.readFileSync(`${__dirname}/settings.json`)
		settings = JSON.parse(dataJSON)
		startServer()
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

server.post('/sendimage', (req, res) => {
	imageSync(req, res, settings.paths.images).then(() => {
		console.log('Image Saved!')
	}).catch(err => {
		console.error(err)
	})
})

server.post('/sendfile', (req, res) => {
	fileSync(req, res, settings.paths.files).then(() => {
		console.log('File Saved!')
	}).catch(err => {
		console.error(err)
	})
})

server.post('/test', (req, res) => {
	console.log(req.body)
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
			startServer()
		}
	})
})

ipcMain.on('killSetupScreen', (event, args) => {
	mainWindow.hide()
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
