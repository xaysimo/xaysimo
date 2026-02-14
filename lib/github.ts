
export const pushToGithubGist = async (token: string, data: any, gistId?: string) => {
  const fileName = 'XAYSIMO_ERP_MASTER_DATABASE.json';
  const description = `ERP Master Database Sync - ${new Date().toLocaleString()}`;
  
  const url = gistId ? `https://api.github.com/gists/${gistId}` : 'https://api.github.com/gists';
  const method = gistId ? 'PATCH' : 'POST';

  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: description,
        public: false,
        files: {
          [fileName]: {
            content: JSON.stringify(data, null, 2),
          },
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Bad credentials: Your GitHub token is invalid or has expired.');
      }
      const error = await response.json();
      throw new Error(error.message || `GitHub API Error (${response.status})`);
    }

    return await response.json();
  } catch (err: any) {
    console.error('GitHub Sync Failed:', err.message);
    throw err;
  }
};

export const fetchAllGists = async (token: string) => {
  try {
    const response = await fetch('https://api.github.com/gists', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
      }
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Bad credentials: Your GitHub token is invalid or has expired.');
      }
      throw new Error(`Failed to fetch gists (${response.status})`);
    }
    
    return await response.json();
  } catch (err: any) {
    console.error('GitHub Fetch Error:', err.message);
    throw err;
  }
};
