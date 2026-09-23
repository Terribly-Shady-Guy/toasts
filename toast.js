class NotificationQueue {
    #queue = [];

    get isEmpty() {
        return this.#queue.length === 0;
    }

    enqueue(notification) {
        this.#queue.push(notification);
    }

    dequeue() {
        return this.isEmpty ? null : this.#queue.shift();
    }
}

const notifications = new NotificationQueue();

const toastNotificationStyles = new Map()
    .set("info", {
        class: "toast-info",
        badge: "info-circle-fill.svg"
    })
    .set("success", {
        class: "toast-success",
        badge: "check-circle-fill.svg"
    })
    .set("warning", {
        class: "toast-warning",
        badge: "exclamation-triangle-fill.svg"
    })
    .set("error", {
        class: "toast-error",
        badge: "exclamation-circle-fill.svg"
    });

const toastTemplate = document.querySelector("#toast-template");
const toaster = document.querySelector(".toaster");

const slideOutAnimationName = "slideOut";

toaster.addEventListener("animationend", event => {
    if (event.animationName === slideOutAnimationName) {
        event.target.remove();
    }
});

toaster.addEventListener("animationstart", event => {
    if (event.animationName === slideOutAnimationName) {
        const dismissButton = event.target.querySelector(".dismiss-button");
        if (dismissButton === null) {
           return;
        }

        dismissButton.disabled = true;
    }
});

toaster.addEventListener("click", event => {
    const eventTargetElement = event.target;
    if (!eventTargetElement.classList.contains("dismiss-button")) {
        return;
    }

    const toast = eventTargetElement.closest(".toaster > .toast");
    if (toast === null) {
        return;
    }

    const toastSlideOutAnimation = toast.getAnimations()
        .find(animation => animation.animationName === slideOutAnimationName);
    
    if (toastSlideOutAnimation === undefined) {
        return;
    }

    toastSlideOutAnimation.effect.updateTiming({delay: 0});
    toastSlideOutAnimation.play();
});

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
        if (notification === null) {
            break;
        }
        
        const toastFragment = toastTemplate.content.cloneNode(true);

        const toastStyle = toastNotificationStyles.get(notification.type);
        if (toastStyle !== undefined) {
            const toast = toastFragment.querySelector(".toast");
            toast.classList.add(toastStyle.class);

            await setToastBadge(toastFragment, toastStyle.badge);
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

async function setToastBadge(toastFragment, badge) {
    try {
        const response = await fetch(`/${badge}`, {
            method: "GET",
            headers: {
                accepts: "image/svg+xml"
            }
        });

        if (!response.ok) {
            throw new Error(`Server responded with status code ${response.status}.`);
        }

        const image = toastFragment.querySelector(".toast-image");
            
        const svg = await response.text();
        image.innerHTML = svg;
    } catch (error) {
        console.error("Failed to get toast badge.", error);
    }
}