/**
 * @file Manages toast notifications used in the page.
 * @typedef {{
 *  type: string, 
 *  title: string, 
 *  content: string
 * }} ToastNotification
 */

/**
 * A queue for managing notifications.
 */
class NotificationQueue {
    /** @type {ToastNotification[]} */
    #queue = [];

    get isEmpty() {
        return this.#queue.length === 0;
    }

    /**
     * Adds a notification to the queue.
     * @param {ToastNotification} notification 
     */
    enqueue(notification) {
        this.#queue.push(notification);
    }

    /**
     * Retrieves and removes the next notification object from the queue.
     * @returns {ToastNotification|undefined} ToastNotification if items in queue, or undefined if empty.
     */
    dequeue() {
        return this.#queue.shift();
    }
}

const notifications = new NotificationQueue();

/**@type {Map<string, {class: string, badgeTemplate: HTMLTemplateElement|null}>} */
const toastNotificationStyles = new Map()
    .set("info", {
        class: "toast-info",
        badgeTemplate: document.querySelector("#info-circle-svg")
    })
    .set("success", {
        class: "toast-success",
        badgeTemplate: document.querySelector("#check-circle-svg")
    })
    .set("warning", {
        class: "toast-warning",
        badgeTemplate: document.querySelector("#exclamation-triangle-svg")
    })
    .set("error", {
        class: "toast-error",
        badgeTemplate: document.querySelector("#exclamation-circle-svg")
    });

/**
 * The template element providing the structure used for an individual toast popup. 
 * @type {HTMLTemplateElement|null}
 * */
const toastTemplate = document.querySelector("#toast-template");
/** 
 * The container used for displaying toasts.
 * @type {HTMLDivElement|null} 
 */
const toaster = document.querySelector(".toaster");

const toastExitAnimationName = matchMedia("(prefers-reduced-motion: reduce)")
    .matches ? "fadeOut" : "slideOut";

// Event delegation used to avoid binding event listeners for each individual toast, and cleaning them up after removal.
toaster.addEventListener("animationend", event => {
    if (event.animationName === toastExitAnimationName) {
        event.target.remove();
    }
});

toaster.addEventListener("animationstart", event => {
    if (event.animationName === toastExitAnimationName) {
        const dismissButton = event.target.querySelector(".dismiss-button");
        if (dismissButton === null) {
           return;
        }

        dismissButton.disabled = true;
    }
});

toaster.addEventListener("click", event => {
    if (!event.target.classList.contains("dismiss-button")) {
        return;
    }

    /**@type {HTMLDivElement|null} */
    const toast = event.target.closest(".toaster > .toast");
    if (toast === null) {
        return;
    }

    const toastExitAnimation = toast.getAnimations()
        .find(animation => animation.animationName === toastExitAnimationName);
    
    if (toastExitAnimation === undefined) {
        return;
    }

    toastExitAnimation.effect.updateTiming({delay: 0});
    toastExitAnimation.play();
});

/**
 * Queues a new notification to be displayed.
 * @param {ToastNotification} notification 
 */
async function pushNotification(notification) {
    notifications.enqueue(notification);
    await renderNotifications();
}

let isProcessing = false;

async function renderNotifications() {
    if (isProcessing) {
        return;
    }

    isProcessing = true;

    while (!notifications.isEmpty) {
        await waitForFreeToasterSpace();

        const notification = notifications.dequeue();
        if (notification === undefined) {
            break;
        }
        
        const toastFragment = toastTemplate.content.cloneNode(true);

        const toastStyle = toastNotificationStyles.get(notification.type);
        if (toastStyle !== undefined) {
            const toast = toastFragment.querySelector(".toast");
            toast.classList.add(toastStyle.class);

            const svg = toastStyle.badgeTemplate.content.cloneNode(true);
            const imgContainer = toastFragment.querySelector(".toast-image");
            imgContainer.appendChild(svg);
        }

        const title = toastFragment.querySelector(".toast-text-title");
        title.innerText = notification.title;

        const content = toastFragment.querySelector(".toast-text-content");
        content.innerText = notification.content;

        toaster.appendChild(toastFragment);
    }

    isProcessing = false;
}

function waitForFreeToasterSpace() {
    if (isToasterFree(toaster)) {
        return Promise.resolve();
    }

    return new Promise(resolve => {
        const toasterObserver = new MutationObserver((mutations, observer) => {
            for (const mutation of mutations) {
                const mutatedNode = mutation.target;
                if (mutatedNode.nodeType === Node.ELEMENT_NODE
                    && mutatedNode.classList.contains("toaster")
                    && isToasterFree(mutatedNode)) {
                    observer.disconnect();
                    resolve();

                    break;
                }
            }
        });

        toasterObserver.observe(toaster, { 
            childList: true,
            subtree: false,
            characterData: false,
            attributes: false
        });
    });
}

function isToasterFree(toaster) {
    return toaster.children.length < 1;
}