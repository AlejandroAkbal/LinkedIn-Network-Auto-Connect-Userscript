// ==UserScript==
// @name            LinkedIn Network Auto Connect
// @namespace       AlejandroAkbal
// @version         0.1
// @description     Automatically connect with people on the "My Network" LinkedIn page
// @author          Alejandro Akbal
// @license         AGPL-3.0
// @icon            https://www.google.com/s2/favicons?sz=64&domain=linkedin.com
// @homepage        https://github.com/AlejandroAkbal/LinkedIn-Network-Auto-Connect-Userscript
// @downloadURL     https://raw.githubusercontent.com/AlejandroAkbal/LinkedIn-Network-Auto-Connect-Userscript/main/src/main.user.js
// @updateURL       https://raw.githubusercontent.com/AlejandroAkbal/LinkedIn-Network-Auto-Connect-Userscript/main/src/main.user.js
// @match           https://www.linkedin.com/mynetwork/
// @grant           none
// @require https://cdn.jsdelivr.net/gh/CoeJoder/waitForKeyElements.js@v1.2/waitForKeyElements.js
// @run-at          document-idle
// ==/UserScript==

;(function () {
  'use strict'

  /** @typedef {Object} personData
   * @property {string} name
   * @property {Element} connectElement
   */

  /** @param {number} ms
   * @returns {Promise<void>}
   */
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  /**
   * Adds a random delay between 0 and 500 ms
   * @param {number} ms
   * @returns {number}
   */
  function addRandomDelay(ms) {
    return ms + Math.floor(Math.random() * 500)
  }

  class LinkedIn {
    /**
     * Delay for actions like clicking buttons
     * @private
     */
    actionDelay = undefined

    /**
     * Delay for actions like scrolling from top to bottom
     * @private
     */
    scrollDelay = undefined

    /**
     * Delay for actions like clicking next page button
     * @private
     */
    nextPageDelay = undefined

    /**
     * Set to -1 for unlimited requests
     * @private
     */
    maxRequests = undefined

    /** @private
     * @default 0
     */
    totalRequestsSent = 0

    constructor({ actionDelay = 3000, scrollDelay = 1500, nextPageDelay = 2000, maxRequests = 250 }) {
      this.scrollDelay = scrollDelay
      this.actionDelay = actionDelay
      this.nextPageDelay = nextPageDelay
      this.maxRequests = maxRequests
    }

    /** @public
     * @returns {Promise<void>}
     */
    async init() {
      console.info('Script initialized...')

      await this.scrollThroughPage()

      await this.mainLoop()
    }

    /** @private
     * @returns {Promise<void>}
     */
    async scrollThroughPage() {
      console.debug(`Scrolling to bottom in ${this.scrollDelay} ms`)

      await sleep(this.actionDelay)

      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })

      console.debug(`Scrolling to top in ${this.scrollDelay} ms`)

      await sleep(this.actionDelay)

      window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    /** @private
     * @returns {Promise<void>}
     */
    async mainLoop() {
      const persons = this.getConnectionsFromCurrentPage()

      try {
        await this.sendConnectionRequests(persons)

        // Restart if max requests not reached
        if (this.totalRequestsSent < this.maxRequests) await this.init()
      } finally {
        this.finish()
      }
    }

    /** @private
     * @returns {personData[]}
     */
    getConnectionsFromCurrentPage() {
      const connectButtonSelector = 'button.artdeco-button.artdeco-button--2.artdeco-button--secondary'
      const personNameSelector = 'span.discover-person-card__name'

      const persons = []

      const buttonElements = document.querySelectorAll(connectButtonSelector)

      const filteredButtonElements = Array.from(buttonElements).filter(
        (element) => element.textContent?.trim() === 'Connect'
      )

      if (!filteredButtonElements || filteredButtonElements.length === 0) {
        console.warn('No connect buttons found on page!')
        return []
      }

      console.info(`Found ${filteredButtonElements.length} connect buttons`)

      filteredButtonElements.forEach((buttonElement) => {
        const personName = buttonElement
          .closest('section')
          ?.querySelector(personNameSelector)
          ?.textContent?.trim()
          ?.split(' ')[0]

        if (!personName) {
          console.warn('No name found for button', buttonElement)
          return
        }

        persons.push({
          name: personName,
          connectElement: buttonElement
        })
      })

      return persons
    }

    /** @private
     * @param {personData[]} persons
     * @returns {Promise<void>}
     */
    async sendConnectionRequests(persons) {
      for (const person of persons) {
        //

        if (this.totalRequestsSent >= this.maxRequests) {
          console.info('Max requests reached')
          break
        }

        const delay = addRandomDelay(this.actionDelay)

        console.info(`Sending connection invite to "${person.name}"`)

        person.connectElement.click()

        this.totalRequestsSent += 1

        await sleep(delay)

        if (this.hasReachedWeeklyLimit()) throw new Error('Reached weekly limit')
        this.closePossiblePopup()
      }
    }
    /** @private
     * @returns {boolean}
     */
    hasReachedWeeklyLimit() {
      const limitModalSelector = '#ip-fuse-limit-alert__header'

      const limitElement = document.querySelector(limitModalSelector)

      if (limitElement && limitElement.textContent?.trim() === 'You’ve reached the weekly invitation limit') {
        console.warn('Reached weekly limit!')
        return true
      }

      return false
    }
    /** @private
     * @returns {void}
     */
    closePossiblePopup() {
      const popupCloseButtonSelector = 'button.artdeco-button.ip-fuse-limit-alert__primary-action'

      const popupCloseButton = document.querySelector(popupCloseButtonSelector)

      if (!popupCloseButton) {
        console.debug('No popup close button found, continuing...')
        return
      }

      console.info('Closing popup')

      popupCloseButton.click()
    }

    /** @private
     * @returns {void}
     */
    finish() {
      console.info(`Completed after sending ${this.totalRequestsSent} connection requests`)
    }
  }

  function createInPageMenu(mainElement) {
    // Create div
    const sectionElement = document.createElement('section')
    sectionElement.id = 'linkedin-network-auto-connect'
    sectionElement.className = 'artdeco-card mb4 p4 display-flex flex-column align-items-center'

    mainElement.prepend(sectionElement)

    // Create title
    const titleElement = document.createElement('h2')
    titleElement.className = 't-20 mb1'
    titleElement.textContent = 'LinkedIn Network Auto Connect'

    sectionElement.appendChild(titleElement)

    // Create warning message
    const messageElement = document.createElement('p')
    messageElement.className = 't-16 mb3'
    messageElement.textContent =
      'This script will send connection requests to all users on the page. Use at your own risk.'

    sectionElement.appendChild(messageElement)

    // Create button
    const buttonElement = document.createElement('button')
    buttonElement.className = 'artdeco-button artdeco-button--2 artdeco-button--primary'

    buttonElement.textContent = 'Auto Connect'

    buttonElement.addEventListener('click', () => {
      linkedin.init()

      buttonElement.disabled = true
      buttonElement.textContent = 'Running...'
    })

    sectionElement.appendChild(buttonElement)
  }

  const linkedin = new LinkedIn({})

  waitForKeyElements('#main', (element) => {
    createInPageMenu(element)
  })
})()
