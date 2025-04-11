import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const page = searchParams.get('page') || 1;

    if (!query) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    if (!process.env.TMDB_API_KEY) {
      console.error('TMDB_API_KEY is not set in environment variables');
      return NextResponse.json({ error: 'TMDB API key is not configured' }, { status: 500 });
    }

    // Search for movies
    const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.TMDB_API_KEY}&query=${encodeURIComponent(query)}&page=${page}`;
    console.log('TMDB API URL:', searchUrl);

    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();
    
    if (!searchResponse.ok) {
      console.error('TMDB API Error:', searchData);
      throw new Error(`TMDB API Error: ${searchResponse.status} ${searchResponse.statusText}`);
    }

    // Fetch video information for each movie
    const moviesWithVideos = await Promise.all(
      searchData.results.map(async (movie) => {
        try {
          const videoUrl = `https://api.themoviedb.org/3/movie/${movie.id}/videos?api_key=${process.env.TMDB_API_KEY}`;
          const videoResponse = await fetch(videoUrl);
          const videoData = await videoResponse.json();

          // Find the first official trailer or teaser
          const trailer = videoData.results?.find(
            video => video.type === 'Trailer' && video.official
          ) || videoData.results?.[0];

          return {
            ...movie,
            videoUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
            trailerUrl: trailer ? `https://www.youtube.com/embed/${trailer.key}` : null
          };
        } catch (error) {
          console.error(`Error fetching videos for movie ${movie.id}:`, error);
          return movie;
        }
      })
    );

    return NextResponse.json({
      ...searchData,
      results: moviesWithVideos
    });
  } catch (error) {
    console.error('Error searching movies:', error);
    return NextResponse.json({ 
      error: 'Failed to search movies',
      details: error.message 
    }, { status: 500 });
  }
} 