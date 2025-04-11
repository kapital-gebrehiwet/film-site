const TMDB_API_KEY = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export async function searchMovies(query) {
  try {
    const response = await fetch(
      `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch movies');
    }

    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error searching movies:', error);
    return [];
  }
}

export async function getMovieDetails(movieId) {
  try {
    // Fetch movie details with videos and credits
    const response = await fetch(
      `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&append_to_response=videos,credits`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch movie details');
    }

    const data = await response.json();
    
    // Find the official trailer
    const trailer = data.videos?.results?.find(
      video => video.type === 'Trailer' && video.site === 'YouTube'
    );

    return {
      ...data,
      trailer: trailer ? {
        key: trailer.key,
        name: trailer.name,
        site: trailer.site,
        type: trailer.type
      } : null
    };
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return null;
  }
} 