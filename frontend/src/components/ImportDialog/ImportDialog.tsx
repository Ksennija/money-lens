import { useEffect, useRef } from "react";
import ImportComponent from "../ImportComponent/ImportComponent";
import styles from "./ImportDialog.module.scss";

type ImportDialogProps = {
  open: boolean;
  onClose: () => void; // the × button and the Escape key both end up here
  onImported: () => void;
};

// The CSV import in a modal dialog. The form is only rendered while the dialog is open, so it
// starts empty every time. The browser traps focus inside and closes the dialog on Escape.
export default function ImportDialog({ open, onClose, onImported }: ImportDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const isOpen = dialog.hasAttribute("open");
    if (open && !isOpen) dialog.showModal();
    if (!open && isOpen) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label="Import transactions"
      onClose={onClose}
    >
      {open && (
        <>
          <button
            type="button"
            className={styles.close}
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
          <ImportComponent onImported={onImported} />
        </>
      )}
    </dialog>
  );
}
