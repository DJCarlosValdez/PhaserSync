/* eslint-disable no-undef */
const { ipcRenderer } = require('electron')

let dataPortalActive = true
let bolt = false
let notifications = []
let files = []

const generateRandomCode = (() => {
	const USABLE_CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')

	return length => {
		return new Array(length).fill(null).map(() => {
			return USABLE_CHARACTERS[Math.floor(Math.random() * USABLE_CHARACTERS.length)]
		}).join('')
	}
})()

ipcRenderer.send('loadSettingsReq')

ipcRenderer.on('loadSettingsRes', (e, args) => {
	$('#device-name').html(args[0].deviceName)
	$('#device-ip').html(args[1])
	$('.qr-code').html(args[2])
})

const showQR = () => {
	anime({
		targets: '.modal-bg',
		duration: 400,
		opacity: [0, 0.4],
		easing: 'easeOutCubic',
		begin: () => {
			$('#qr-modal').removeClass('is-hidden')
		}
	})

	anime({
		targets: '.modal-box',
		duration: 700,
		translateY: ['-100', 0],
		opacity: [0, 1],
		easing: 'easeOutCubic'
	})
}

const hideQR = () => {
	anime({
		targets: '.modal-bg',
		duration: 400,
		opacity: 0,
		easing: 'easeOutCubic'
	})

	anime({
		targets: '.modal-box',
		duration: 700,
		translateY: '-100',
		opacity: 0,
		easing: 'easeOutCubic',
		complete: () => {
			$('.modal').addClass('is-hidden')
		}
	})
}

$('.modal-bg').on('click', () => {
	hideQR()
})

$('#show-qr').on('click', () => {
	showQR()
})

/**
 * @param {string} icon CSS.gg icon to show in notification toast
 * @param {string} message Message to show in notification toast
 * @param {('floating'|'persistent')} display Persistance of notification
 * @param {string} id Tracking ID for notification
 */

let zIndexNotification = 100

const createNotification = (icon, message, display, id) => {
	let selectedIcon = icon
	let selectedID = id
	if (!icon) {
		selectedIcon = 'bell'
	}

	if (!id) {
		selectedID = `notification${generateRandomCode(4)}`
	}

	zIndexNotification++

	$('.templates .template-notification-box').clone().appendTo($('.notification-bar')).addClass('toast-temp notification-box').removeClass('template-notification-box')
	$('.toast-temp .icon i').addClass(`gg-${selectedIcon}`)
	$('.toast-temp .message p').html(message)
	$('.toast-temp').attr('id', selectedID)
	$('.toast-temp').css('z-index', zIndexNotification)
	$('.toast-temp').removeClass('toast-temp')

	notifications.push({
		id: selectedID,
		display: display,
		message: message,
		icon: icon
	})

	console.log({
		id: selectedID,
		display: display,
		message: message,
		icon: icon
	})

	anime({
		targets: `#${selectedID}`,
		duration: 600,
		translateY: [100, 0],
		easing: 'easeOutCubic',
		begin: () => {
			$(`#${selectedID}`).removeClass('is-hidden')
		},
		complete: () => {
			killNotification(selectedID)
		}
	})
}

const offset = (target) => {
	const rect = target.getBoundingClientRect()
	const height = document.body.scrollHeight
	return height - rect.top
}

const killNotification = (target) => {
	setTimeout(() => {
		console.log('Notification timeout: ', target)
		const query = notifications.find(notification => {
			return notification.id === target
		})

		if (query) {
			zIndexNotification--
			const posY = offset(document.getElementById(target))
			console.log(posY)
			anime({
				targets: `#${target}`,
				duration: 600,
				translateY: [0, 50 + posY],
				easing: 'easeOutCubic',
				complete: () => {
					$(`#${target}`).remove()
					notifications = notifications.filter(notification => {
						return notification.id !== target
					})
				}
			})
		}
	}, 3000)
}

// TODO: ADD MORE SETTINGS

$('#toggle-data').on('click', () => {
	if (dataPortalActive) {
		createNotification('data', 'Data portal off!', 'floating')
		$('#toggle-data .toggle-status').removeClass('is-active')
		dataPortalActive = false
		ipcRenderer.send('togglePortal')
	} else {
		createNotification('data', 'Data portal on!', 'floating')
		$('#toggle-data .toggle-status').addClass('is-active')
		dataPortalActive = true
		ipcRenderer.send('togglePortal')
	}
})

$('#toggle-bolt').on('click', () => {
	ipcRenderer.send('toggleBolt')
	if (bolt) {
		createNotification('bolt', 'Bolt mode off!', 'floating')
		$('#toggle-bolt .toggle-status').removeClass('is-active')
		bolt = false
	} else {
		createNotification('bolt', 'Bolt mode on!', 'floating')
		$('#toggle-bolt .toggle-status').addClass('is-active')
		bolt = true
	}
})

// TODO: CHANGE ICON

const createFile = (id, device, type, fileName) => {
	console.log(device)
	console.log(type)

	$('.templates .template-file').clone().appendTo($('.file-list')).addClass('file-temp file').removeClass('template-file')
	console.log($('.file-temp .device-name'))
	$('.file-temp .device-name').html(device)
	$('.file-temp .file-device').html(device)
	$('.file-temp .file-type').html(type)
	$('.file-temp').attr('id', `${id}`)

	if (fileName) {
		$('.file-temp .file-name').html(fileName)
	}

	if (bolt) {
		$('.file-temp .file-level-1').removeClass('is-hidden')
		$('.file-temp .file-level-2').addClass('is-hidden')
	} else {
		$('.file-temp .file-level-2').removeClass('is-hidden')
		$('.file-temp .file-level-1').addClass('is-hidden')
	}

	$('.file-temp').removeClass('file-temp is-hidden')

	files.push({
		id: id,
		type: type,
		device: device
	})

	console.log({
		id: id,
		type: type,
		device: device
	})

	hideQR()
	assignFileHandlers(id)
}

// IDEA: ADD CLOUD SYNC

const assignFileHandlers = (id) => {
	const query = files.find(file => {
		return file.id === id
	})

	if (query) {
		$(`#${id} .accept`).on('click', () => {
			allowFile(id)
		})

		$(`#${id} .deny`).on('click', () => {
			denyFile(id)
		})

		$(`#${id} .open`).on('click', () => {
			showFile(id)
		})

		$(`#${id} .remove`).on('click', () => {
			removeFile(id)
		})
	}
}

const allowFile = (id) => {
	const query = files.find(file => {
		return file.id === id
	})

	if (query) {
		$(`#${query.id} .accept-wrapper`).addClass('is-hidden')
		$(`#${query.id} .loading-wrapper`).removeClass('is-hidden')

		ipcRenderer.send('allowDownload', query.id)
	}
}

const denyFile = (id) => {
	const query = files.find(file => {
		return file.id === id
	})

	if (query) {
		$(`#${query.id}`).remove()
		files = files.filter(file => {
			return file.id !== query.id
		})

		ipcRenderer.send('denyDownload', query.id)
	}
}

const removeFile = (id) => {
	const query = files.find(file => {
		return file.id === id
	})

	if (query) {
		$(`#${query.id}`).remove()
		files = files.filter(file => {
			return file.id !== query.id
		})

		ipcRenderer.send('removeFileInList', query.id)
	}
}

const showFile = (id) => {
	const query = files.find(file => {
		return file.id === id
	})

	if (query) {
		ipcRenderer.send('showFolder', query.id)
	}
}

ipcRenderer.on('requestDownload', (e, file) => {
	if (file) {
		console.log(file.id, file.device, file.contentType)
		createFile(file.id, file.device, file.contentType)
	}
})

ipcRenderer.on('createDownload', (e, file) => {
	if (file) {
		console.log(file.id, file.device, file.contentType, file.fileName)
		createFile(file.id, file.device, file.contentType, file.fileName)
	}
})

ipcRenderer.on('downloadFinish', (e, args) => {
	if (args) {
		const query = files.find(file => {
			return file.id === args.id
		})

		if (query) {
			setTimeout(() => {
				$(`#${query.id} .file-name`).html(args.fileName)
				$(`#${query.id} .file-level-1`).removeClass('is-hidden')
				$(`#${query.id} .file-level-2`).addClass('is-hidden')
				$(`#${query.id} .loading-wrapper`).addClass('is-hidden')
			}, 1000)
		}
	}
})
