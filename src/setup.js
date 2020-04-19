/* eslint-disable no-undef */

const jump = require('jump.js')
const { ipcRenderer } = require('electron')

let wizard = 'noob'
let requirePin = false
const settings = {
	deviceName: undefined,
	network: {
		port: 3000
	},
	security: {
		pin: {
			enabled: false,
			value: undefined
		}
	},
	// IDEA: Add option in expert mode to add specific paths
	paths: {
		root: undefined,
		images: undefined,
		files: undefined
	}
}

const changeScreen = (target) => {
	$(target).removeClass('is-hidden')
	jump(target)
}

$('#btn-landing-continue').on('click', () => {
	changeScreen('#config-wizard-screen')
})

$('#wizard-form .radio-wrapper').on('click', function () {
	$('#wizard-form .radio-wrapper').removeClass('is-active is-missing')
	$(this).addClass('is-active')
	$('#wizard-form input').prop('checked', false)
	$(`#${$(this).attr('id')} input`).prop('checked', true)
})

$('#btn-wizard-continue').on('click', () => {
	const selectedWizOption = $('#wizard-form input[type=radio]:checked').val()
	if (!selectedWizOption) {
		$('#wizard-form .radio-wrapper').addClass('is-missing')
	} else if (selectedWizOption === 'wizard-noob') {
		wizard = 'noob'
		changeScreen('#config-noob-screen')
	} else if (selectedWizOption === 'wizard-expert') {
		wizard = 'expert'
		changeScreen('#config-noob-screen')
	}
})

$('#btn-name-continue').on('click', () => {
	const deviceName = $('#device-name').val()
	if (!deviceName) {
		$('#device-name').addClass('is-missing')
	} else {
		settings.deviceName = deviceName
		$('#device-name').removeClass('is-missing')
		changeScreen('#config-noob-screen2')
	}
})

$('#pin-form .radio-wrapper').on('click', function () {
	$('#pin-form .radio-wrapper').removeClass('is-active is-missing')
	$(this).addClass('is-active')
	$('#pin-form input').prop('checked', false)
	$(`#${$(this).attr('id')} input`).prop('checked', true)
	const pinOption = $('#pin-form input[type=radio]:checked').val()

	if (pinOption === 'yes') {
		requirePin = true
		$('#pin-wrapper').removeClass('is-hidden')
	} else {
		requirePin = false
		$('#pin-wrapper').addClass('is-hidden')
	}
})

$('#btn-pin-continue').on('click', () => {
	const pin = $('#server-pin').val()
	let valid = false

	if ($('#pin-form input[type=radio]:checked').val() !== undefined) {
		if (!requirePin) {
			valid = true
			settings.security.pin.enabled = false
			settings.security.pin.value = undefined
		} else {
			if (pin) {
				valid = true
				settings.security.pin.enabled = true
				settings.security.pin.value = pin
			}
		}

		if (valid) {
			changeScreen('#config-noob-screen3')
		} else {
			$('#server-pin').addClass('is-missing')
		}
	} else {
		$('#pin-form .radio-wrapper').addClass('is-missing')
	}
})

$('#system-path').on('click', () => {
	ipcRenderer.send('chooseDirectory')
})

let path

ipcRenderer.on('inputPath', (e, args) => {
	path = args
})

$('#btn-path-continue').on('click', () => {
	if (path) {
		if (wizard === 'expert') {
			changeScreen('#config-expert-screen')
		} else {
			settings.paths.root = path
			settings.paths.images = `${path}\\Images`
			settings.paths.videos = `${path}\\Videos`
			settings.paths.files = `${path}\\Files`
			setUp()
		}
	} else {
		$('#system-path button').addClass('is-missing')
	}
})

$('#btn-port-continue').on('click', () => {
	const port = $('#server-port').val()

	if (port) {
		settings.network.port = port
		setUp()
	} else {
		$('#server-port').addClass('is-missing')
	}
})

const setUp = () => {
	changeScreen('#setup-finish')
	if (settings) {
		ipcRenderer.send('createSettingsFile', settings)
	}

	setTimeout(() => {
		ipcRenderer.send('killSetupScreen')
	}, 3000)
}
