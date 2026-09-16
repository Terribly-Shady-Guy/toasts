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

const notifyForm = document.querySelector("#notify-form");
const toastTemplate = document.querySelector("template");
const toaster = document.querySelector(".toaster");

const notifications = new NotificationQueue();
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
        
        const result = ((type) => {
            switch (type) {
                case "info":
                    return {
                        class: "toast-info",
                        badge: "info-circle-fill.svg"
                    };
                case "success":
                    return {
                        class: "toast-success",
                        badge: "check-circle-fill.svg"
                    };
                case "warning":
                    return {
                        class: "toast-warning",
                        badge: "exclamation-triangle-fill.svg"
                    };
                default: 
                    return {
                        class: "toast-error",
                        badge: "exclamation-circle-fill.svg"
                    };
            }
        })(notification.type);

        const toastFragment = toastTemplate.content.cloneNode(true);
        const toast = toastFragment.querySelector(".toast");
        
        toast.addEventListener("animationend", event => {
            if (event.animationName === "slideOut") {
                event.currentTarget.remove();
            }
        })

        toast.classList.add(result.class); 

        const image = toastFragment.querySelector(".toast-image");

        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const svgUse = document.createElementNS("http://www.w3.org/2000/svg", "use");

        svgUse.setAttribute("href", result.badge);
        svgUse.setAttribute("width", 25);
        svgUse.setAttribute("height", 25);

        svg.appendChild(svgUse);
        image.appendChild(svg);

        const title = toastFragment.querySelector(".toast-text-title");
        title.innerText = notification.title;

        const content = toastFragment.querySelector(".toast-text-content");
        content.innerText = notification.content;

        toaster.appendChild(toastFragment);

        const displayTimeout = () => new Promise((resolve) => {
            const id = setTimeout(resolve, 5 * 1000);

            const dismissButton = toast.querySelector(".dismiss-button");
            dismissButton.addEventListener("click", () => {
                clearTimeout(id);
                resolve();
            }, {once: true});
        });

        await displayTimeout();
        toast.classList.add("toast-slide-out");
    }

    isProcessing = false;
}