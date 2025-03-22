import axios from 'axios';

export async function getAPIUsingHeadlessBrowser(
    url: string
) {
    const res = await axios.get(url);
    return res.data;
}
  