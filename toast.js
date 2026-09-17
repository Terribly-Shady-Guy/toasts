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

const notifyForm = document.querySelector("#notify-form");
const toastTemplate = document.querySelector("#toast-template");
const toaster = document.querySelector(".toaster");

notifyForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const notification = {
        type: "info",
        title: "",
        content: ""
    };

    const submittedForm = event.currentTarget;

    notification.type = submittedForm.elements.namedItem("toastType").value;
    notification.title = submittedForm.elements.namedItem("title").value;
    notification.content = submittedForm.elements.namedItem("content").value;

    await pushNotification(notification);
});

toaster.addEventListener("animationend", event => {
    if (event.animationName === "slideOut") {
        event.target.remove();
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

    const toastSlideInAnimation = toast.getAnimations()
        .find(animation => animation.animationName === "slideOut");
    
    if (toastSlideInAnimation === undefined) {
        return;
    }

    toastSlideInAnimation.effect.updateTiming({delay: 0});
    toastSlideInAnimation.play();
});

let isProcessing = false;

async function pushNotification(notification) {
    notifications.enqueue(notification);
    await processNotifications();
}

async function processNotifications() {
    if (isProcessing) {
        return;
    }

    isProcessing = true;

    while (!notifications.isEmpty) {
        const notification = notifications.dequeue();
        if (notification === null) {
            break;
        }
        
        const toastStyle = toastNotificationStyles.get(notification.type);

        const toastFragment = toastTemplate.content.cloneNode(true);
        const toast = toastFragment.querySelector(".toast");

        if (toastStyle !== undefined) {
            toast.classList.add(toastStyle.class);

            const image = toastFragment.querySelector(".toast-image");

            const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            svg.setAttribute("viewBox", "0 0 25 25");

            const svgUse = document.createElementNS("http://www.w3.org/2000/svg", "use");

            svgUse.setAttribute("href", `./${toastStyle.badge}`);
            svgUse.setAttribute("width", 25);
            svgUse.setAttribute("height", 25);

            svg.appendChild(svgUse);
            image.appendChild(svg);
        } 

        const title = toastFragment.querySelector(".toast-text-title");
        title.innerText = notification.title;

        const content = toastFragment.querySelector(".toast-text-content");
        content.innerText = notification.content;

        toaster.appendChild(toastFragment);
    }

    isProcessing = false;
}