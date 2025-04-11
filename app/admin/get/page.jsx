'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function MoviesPage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMovies, setFilteredMovies] = useState([]);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [deletingMovies, setDeletingMovies] = useState({});

  useEffect(() => {
    fetchMovies();
  }, []);

  useEffect(() => {
    const filtered = movies.filter(movie =>
      movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      movie.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredMovies(filtered);
  }, [searchQuery, movies]);

  const fetchMovies = async () => {
    try {
      const response = await fetch('/api/admin/get');
      if (!response.ok) throw new Error('Failed to fetch movies');
      
      const data = await response.json();
      setMovies(data);
      setFilteredMovies(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (movieId) => {
    if (!confirm('Are you sure you want to delete this movie? This action cannot be undone.')) {
      return;
    }

    try {
      // Set deleting state for this specific movie
      setDeletingMovies(prev => ({ ...prev, [movieId]: true }));
      
      const response = await fetch(`/api/admin/movies/${movieId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete movie');
      }

      // Show success message
      alert('Movie deleted successfully');
      
      // Refresh the movie list
      await fetchMovies();
    } catch (error) {
      console.error('Error deleting movie:', error);
      alert(error.message || 'Failed to delete movie');
    } finally {
      // Clear deleting state for this movie
      setDeletingMovies(prev => ({ ...prev, [movieId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-500 text-center">
          <p className="text-xl font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Movies collection</h1>
          <div className="relative">
            <input
              type="text"
              placeholder="Search movies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredMovies.map((movie) => (
            <div
              key={movie._id}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              <div className="relative h-64">
                <Image
                  src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                  alt={movie.title}
                  fill
                  className="object-cover"
                />
                <div className="absolute top-2 right-2 bg-yellow-400 text-black px-2 py-1 rounded-full text-sm font-semibold">
                  {movie.voteAverage.toFixed(1)}
                </div>
              </div>
              <div className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold text-gray-800">{movie.title}</h2>
                  <button
                    onClick={() => handleDelete(movie._id)}
                    disabled={deletingMovies[movie._id]}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingMovies[movie._id] ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{movie.description}</p>
                
                {/* Video Player Section */}
                {movie.videoUrl && (
                  <div className="mb-4">
                    <video
                      src={movie.videoUrl}
                      controls
                      className="w-full aspect-video rounded-lg"
                      poster={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                )}
                
                {/* Trailer Section */}
                {movie.trailerUrl && (
                  <div className="mb-4">
                    <iframe
                      src={movie.trailerUrl}
                      title={`${movie.title} Trailer`}
                      className="w-full aspect-video rounded-lg"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )}
                
                {/* Video Info */}
                {(movie.videoUrl || movie.trailerUrl) && (
                  <div className="mb-4 text-sm text-gray-500">
                    <p>Quality: {movie.videoQuality}</p>
                    <p>Format: {movie.videoFormat}</p>
                  </div>
                )}
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {movie.genres.map((genre, index) => (
                    <span
                      key={index}
                      className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>{movie.releaseDate}</span>
                  <span>{movie.runtime} min</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredMovies.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No movies found</p>
          </div>
        )}
      </div>
    </div>
  );
} 