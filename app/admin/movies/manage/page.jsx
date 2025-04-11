'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function ManageMoviesPage() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingMovie, setEditingMovie] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    videoUrl: '',
    trailerUrl: '',
    videoQuality: 'HD',
    videoFormat: 'mp4'
  });

  useEffect(() => {
    fetchMovies();
  }, []);

  const fetchMovies = async () => {
    try {
      const response = await fetch('/api/admin/movies');
      if (!response.ok) throw new Error('Failed to fetch movies');
      
      const data = await response.json();
      setMovies(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (movie) => {
    setEditingMovie(movie);
    setEditForm({
      title: movie.title,
      description: movie.description,
      videoUrl: movie.videoUrl || '',
      trailerUrl: movie.trailerUrl || '',
      videoQuality: movie.videoQuality || 'HD',
      videoFormat: movie.videoFormat || 'mp4'
    });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/admin/movies', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingMovie._id,
          ...editForm,
        }),
      });

      if (!response.ok) throw new Error('Failed to update movie');

      const updatedMovie = await response.json();
      setMovies(movies.map(movie => 
        movie._id === updatedMovie._id ? updatedMovie : movie
      ));
      setEditingMovie(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (movieId) => {
    if (!confirm('Are you sure you want to delete this movie? This action cannot be undone.')) {
      return;
    }

    try {
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
      
      // Clear the selected movie if it was the one being deleted
      if (editingMovie?._id === movieId) {
        setEditingMovie(null);
      }
    } catch (error) {
      console.error('Error deleting movie:', error);
      alert(error.message || 'Failed to delete movie');
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-red-500 text-center py-8">{error}</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Manage Movies</h1>

      {editingMovie && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">Edit Movie</h2>
            <form onSubmit={handleUpdate}>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full p-2 border rounded"
                  rows="4"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Video URL</label>
                <input
                  type="url"
                  value={editForm.videoUrl}
                  onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="Enter video URL"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Trailer URL</label>
                <input
                  type="url"
                  value={editForm.trailerUrl}
                  onChange={(e) => setEditForm({ ...editForm, trailerUrl: e.target.value })}
                  className="w-full p-2 border rounded"
                  placeholder="Enter trailer URL"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Video Quality</label>
                <select
                  value={editForm.videoQuality}
                  onChange={(e) => setEditForm({ ...editForm, videoQuality: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="HD">HD</option>
                  <option value="Full HD">Full HD</option>
                  <option value="4K">4K</option>
                  <option value="8K">8K</option>
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 mb-2">Video Format</label>
                <select
                  value={editForm.videoFormat}
                  onChange={(e) => setEditForm({ ...editForm, videoFormat: e.target.value })}
                  className="w-full p-2 border rounded"
                >
                  <option value="mp4">MP4</option>
                  <option value="mkv">MKV</option>
                  <option value="webm">WebM</option>
                </select>
              </div>
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setEditingMovie(null)}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {movies.map((movie) => (
          <div key={movie._id} className="border rounded-lg overflow-hidden">
            <div className="relative h-64">
              <Image
                src={`https://image.tmdb.org/t/p/w500${movie.posterPath}`}
                alt={movie.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-4">
              <h3 className="font-bold text-lg mb-2">{movie.title}</h3>
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">{movie.description}</p>
              
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
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(movie)}
                  className="flex-1 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(movie._id)}
                  className="flex-1 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 