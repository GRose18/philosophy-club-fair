// Render can return an HTML gateway page even for an API request.
// Never expose that page (or a JSON parser exception) as the user-facing error.
export async function readApiResponse(response, {write = false} = {}) {
  try {
    const data = await response.json();
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid API response');
    return data;
  } catch {
    throw new Error(write
      ? 'The server could not confirm this action. Check whether it completed before trying again. For invitations, check the sender’s Sent mail.'
      : 'The club server is temporarily unavailable. Wait a moment, then refresh or try again.');
  }
}
