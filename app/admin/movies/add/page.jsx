'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import {Input} from '../../../../components/ui/input'

export default function AddMoviesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMovies, setSelectedMovies] = useState([]);
  const router = useRouter();

  const searchMovies = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/admin/movies/search?query=${encodeURIComponent(searchQuery)}`);
      if (!response.ok) throw new Error('Failed to search movies');
      
      const data = await response.json();
      setSearchResults(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addMovie = async (movie) => {
    try {
      const response = await fetch('/api/admin/movies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tmdbId: movie.id,
          title: movie.title,
          originalTitle: movie.original_title,
          description: movie.overview || 'No description available',
          posterPath: movie.poster_path || '/default-poster.jpg',
          backdropPath: movie.backdrop_path || null,
          releaseDate: movie.release_date || 'Unknown',
          voteAverage: movie.vote_average || 0,
          genres: movie.genre_ids || [],
          runtime: movie.runtime || 0,
          videoUrl: movie.videoUrl || null,
          trailerUrl: movie.trailerUrl || null,
          videoQuality: 'HD',
          videoFormat: 'mp4'
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add movie');
      }

      setSelectedMovies([...selectedMovies, movie.id]);
      
      // Show success notification with movie details
      toast.success(
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12">
            <Image
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
              alt={movie.title}
              fill
              className="object-cover rounded"
            />
          </div>
          <div>
            <p className="font-semibold">Movie Added Successfully!</p>
            <p className="text-sm text-gray-600">{movie.title}</p>
          </div>
        </div>,
        {
          duration: 4000,
          position: 'top-right',
          style: {
            background: '#10B981',
            color: 'white',
            padding: '1rem',
            borderRadius: '0.5rem',
          },
        }
      );
    } catch (err) {
      setError(err.message);
      toast.error(err.message, {
        duration: 4000,
        position: 'top-right',
        style: {
          background: '#EF4444',
          color: 'white',
          padding: '1rem',
          borderRadius: '0.5rem',
        },
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Add Movies from TMDB</h1>
      
      <div className="mb-6">
        <div className="flex gap-4">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for movies..."
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={searchMovies}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {searchResults.map((movie) => (
          <div key={movie.id} className="border rounded-lg overflow-hidden">
            <div className="relative h-64">
              {movie.poster_path ? (
                <Image
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500">No poster available</span>
                </div>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-bold text-lg mb-2">{movie.title}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {movie.overview || 'No description available'}
              </p>
              {movie.trailerUrl && (
                <div className="mb-4">
                  <iframe
                    src={movie.trailerUrl}
                    title={`${movie.title} Trailer`}
                    className="w-full aspect-video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
              <button
                onClick={() => addMovie(movie)}
                disabled={selectedMovies.includes(movie.id)}
                className={`w-full py-2 rounded ${
                  selectedMovies.includes(movie.id)
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {selectedMovies.includes(movie.id) ? 'Added' : 'Add to Database'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 