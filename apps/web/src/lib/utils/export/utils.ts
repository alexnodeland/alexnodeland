// Download markdown file
export const downloadMarkdown = (
  markdown: string,
  filename: string = 'resume.md'
) => {
  const blob = new Blob([markdown], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  // Set properties
  if (link.setAttribute) {
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
  } else {
    link.href = url;
    link.download = filename;
  }

  // Ensure the link is properly added to the DOM
  try {
    if (document.body && typeof link.appendChild === 'function') {
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Fallback for testing environments
      link.click();
    }
  } catch (error) {
    // Fallback for testing environments where DOM manipulation fails
    link.click();
  }

  URL.revokeObjectURL(url);
};
