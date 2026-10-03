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

const toastTemplate = document.querySelector("#toast-template");
const toaster = document.querySelector(".toaster");

const toastExitAnimationName = matchMedia("(prefers-reduced-motion: reduce)")
    .matches ? "fadeOut" : "slideOut";

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