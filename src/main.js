/* eslint-disable no-undef */
const { ipcRenderer } = require('electron')

let dataPortalActive = true
let bolt = false
let notifications = []
let files = []

let mapIcons = {}

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
	mapIcons = args[1]
	$('#device-name').html(args[0].deviceName)
	$('#device-ip').html(args[2])
	$('.qr-code').html(args[3])
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
			killNotification(selectedID, 3000)
		}
	})
}

const offset = (target) => {
	const rect = target.getBoundingClientRect()
	const height = document.body.scrollHeight
	return height - rect.top
}

const killNotification = (target, timeout) => {
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
	}, timeout)
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

const createFile = (file) => {
	if (file.type === 'vnd.openxmlformats-officedocument.wordprocessingml.document') {
		file.type = 'docx'
	} else if (file.type === 'vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
		file.type = 'xlsx'
	} else if (file.type === 'vnd.openxmlformats-officedocument.presentationml.presentation') {
		file.type = 'pptx'
	}

	$('.templates .template-file').clone().appendTo($('.file-list')).addClass('file-temp file').removeClass('template-file')
	$('.file-temp .device-name').html(file.device)
	$('.file-temp .file-device').html(file.device)
	$('.file-temp .file-type').html(`${file.contentType} ${file.type}`)
	$('.file-temp').attr('id', `${file.id}`)

	if (file.fileName) {
		$('.file-temp .file-name').html(file.fileName)
	}

	let customIconPath
	let dynamicImage = false

	if (Object.keys(mapIcons).includes('default')) {
		Object.keys(mapIcons).forEach(iconSet => {
			if (!['default', 'image'].includes(iconSet) && mapIcons[iconSet].extensions) {
				if (mapIcons[iconSet].extensions.includes(file.type)) {
					customIconPath = mapIcons[iconSet].path
					console.log(customIconPath)
				}
			} else if (iconSet === 'image' && mapIcons[iconSet].extensions) {
				if (mapIcons[iconSet].dynamic && file.contentType === 'image') {
					dynamicImage = true
				} else {
					dynamicImage = false
					if (mapIcons[iconSet].extensions.includes(file.type)) {
						customIconPath = mapIcons[iconSet].path
						console.log(customIconPath)
					}
				}
			}
		})
	}

	if (customIconPath) {
		$('.file-temp .icon').attr('src', `fileIcons/${customIconPath}`)
	} else if (dynamicImage && file.path) {
		$('.file-temp .icon').attr('src', `${file.path}`)
	} else {
		$('.file-temp .icon').attr('src', 'https://img2.freepng.es/20180605/wr/kisspng-computer-icons-document-clip-art-doc-5b1728d20251f7.1438356115282444340095.jpg')
	}

	if (dynamicImage) {
		$('.file-temp .icon').addClass('is-round')
	}

	if (bolt) {
		$('.file-temp .file-level-1').removeClass('is-hidden')
		$('.file-temp .file-level-2').addClass('is-hidden')
	} else {
		$('.file-temp .file-level-2').removeClass('is-hidden')
		$('.file-temp .file-level-1').addClass('is-hidden')
	}

	$('.file-temp').removeClass('file-temp')

	anime({
		targets: `#${file.id}`,
		translateY: [100, 0],
		opacity: [0, 1],
		duration: 600,
		easing: 'easeOutCubic',
		begin: () => {
			$(`#${file.id}`).removeClass('is-hidden')
		}
	})

	files.push({
		id: file.id,
		type: file.contentType,
		device: file.device
	})

	console.log({
		id: file.id,
		type: file.contentType,
		device: file.device
	})

	hideQR()
	assignFileHandlers(file.id)
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
		files = files.filter(file => {
			return file.id !== query.id
		})

		anime({
			targets: `#${query.id}`,
			duration: 600,
			easing: 'easeOutCubic',
			translateX: [0, -300],
			opacity: [1, 0]
		})

		const remainingElements = $('.file').toArray()
		const removeElement = remainingElements.findIndex(element => {
			return $(element).attr('id') === query.id
		})

		const targetElements = []
		remainingElements.forEach(element => {
			const index = remainingElements.findIndex(query => query === element)
			if (index > removeElement) {
				targetElements.push(element)
			}
		})

		anime({
			targets: [targetElements],
			duration: 600,
			easing: 'easeOutCubic',
			translateY: [0, -90],
			delay: anime.stagger(200),
			complete: () => {
				$(`#${query.id}`).remove()
				$('.file').css('transform', 'translateY(0px)')
			}
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
		createFile(file)
	}
})

ipcRenderer.on('createDownload', (e, file) => {
	if (file) {
		createFile(file)
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
				$(`#${query.id} .icon`).attr('src', `${args.path}`)
				$(`#${query.id} .file-level-1`).removeClass('is-hidden')
				$(`#${query.id} .file-level-2`).addClass('is-hidden')
				$(`#${query.id} .loading-wrapper`).addClass('is-hidden')
			}, 1000)
		}
	}
})
