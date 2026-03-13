export function buildProjectTitleFromPrompt(prompt: string) {
  const trimmed = prompt.trim();
  if (!trimmed) {
    return '未命名项目';
  }

  const maxLength = 18;
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}...` : trimmed;
}
