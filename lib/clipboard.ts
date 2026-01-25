/**
 * Cross-browser clipboard utility with iOS Safari fallback
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern Clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('Clipboard API failed, trying fallback:', err);
    }
  }

  // Fallback for older browsers and iOS edge cases
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Prevent scrolling and make invisible
    textArea.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 2em;
      height: 2em;
      padding: 0;
      border: none;
      outline: none;
      box-shadow: none;
      background: transparent;
      font-size: 16px;
    `;
    // font-size: 16px prevents iOS zoom on focus

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    // iOS requires setSelectionRange
    textArea.setSelectionRange(0, text.length);

    const success = document.execCommand('copy');
    document.body.removeChild(textArea);

    return success;
  } catch (err) {
    console.error('Fallback copy failed:', err);
    return false;
  }
}
