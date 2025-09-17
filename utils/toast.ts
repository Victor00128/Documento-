
class ToastEvents extends EventTarget {
    dispatch(type: 'show', detail: string) {
        this.dispatchEvent(new CustomEvent(type, { detail }));
    }
}

export const toastEvents = new ToastEvents();
