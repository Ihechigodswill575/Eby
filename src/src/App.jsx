import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, ThumbsDown, Instagram, Send, Phone, MapPin, Menu, X, Scissors, Upload, Check, Trash2, AlertCircle } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, push, onValue, update, remove } from 'firebase/database';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCXp9tBR0fBhc8lsv6_0o-8V9SIcBMYp4M",
  authDomain: "websites-171ae.firebaseapp.com",
  databaseURL: "https://websites-171ae-default-rtdb.firebaseio.com",
  projectId: "websites-171ae",
  storageBucket: "websites-171ae.firebasestorage.app",
  messagingSenderId: "1027026269504",
  appId: "1:1027026269504:web:2d797316248b4c1458b6a5",
  measurementId: "G-MJWY96PHFK"
};

// Cloudinary Configuration
const CLOUDINARY_CLOUD_NAME = "dykqgn7xu";
const CLOUDINARY_UPLOAD_PRESET = "ml_default"; // You'll need to set this in Cloudinary

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [designs, setDesigns] = useState([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedDesign, setSelectedDesign] = useState(null);
  const [commentName, setCommentName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [newDesign, setNewDesign] = useState({
    title: '',
    category: 'Bridal',
    description: '',
    image: null
  });
  const [uploading, setUploading] = useState(false);
  const [headerTransparent, setHeaderTransparent] = useState(false);

  // Admin credentials (in production, hash these!)
  const ADMIN_CREDENTIALS = {
    username: 'nelly_admin',
    password: 'NellyJ2025!'
  };

  // Load designs from Firebase
  useEffect(() => {
    const designsRef = ref(database, 'designs');
    onValue(designsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const designsArray = Object.entries(data).map(([id, design]) => ({
          id,
          ...design,
          comments: design.comments ? Object.entries(design.comments).map(([cid, comment]) => ({
            id: cid,
            ...comment
          })) : []
        }));
        setDesigns(designsArray.sort((a, b) => b.timestamp - a.timestamp));
      }
    });
  }, []);

  // Scroll effect for header
  useEffect(() => {
    const handleScroll = () => {
      setHeaderTransparent(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check admin session
  useEffect(() => {
    const adminSession = localStorage.getItem('nellyAdminSession');
    if (adminSession) {
      setIsAdmin(true);
    }
  }, []);

  // Handle admin login
  const handleAdminLogin = () => {
    if (adminUsername === ADMIN_CREDENTIALS.username && adminPassword === ADMIN_CREDENTIALS.password) {
      setIsAdmin(true);
      localStorage.setItem('nellyAdminSession', 'true');
      setCurrentPage('admin');
      setAdminUsername('');
      setAdminPassword('');
    } else {
      alert('Invalid credentials!');
    }
  };

  // Handle admin logout
  const handleAdminLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem('nellyAdminSession');
    setCurrentPage('home');
  };

  // Upload image to Cloudinary
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);

    try {
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData
        }
      );
      const data = await response.json();
      return data.secure_url;
    } catch (error) {
      console.error('Cloudinary upload error:', error);
      throw error;
    }
  };

  // Handle design upload
  const handleDesignUpload = async () => {
    if (!newDesign.title || !newDesign.image) {
      alert('Please fill in all required fields!');
      return;
    }

    setUploading(true);
    try {
      const imageUrl = await uploadToCloudinary(newDesign.image);
      
      const designRef = push(ref(database, 'designs'));
      await set(designRef, {
        title: newDesign.title,
        category: newDesign.category,
        description: newDesign.description,
        imageUrl: imageUrl,
        likes: 0,
        dislikes: 0,
        timestamp: Date.now()
      });

      setNewDesign({ title: '', category: 'Bridal', description: '', image: null });
      setShowUploadForm(false);
      alert('Design uploaded successfully!');
    } catch (error) {
      alert('Upload failed: ' + error.message);
    }
    setUploading(false);
  };

  // Handle like
  const handleLike = async (designId, currentLikes) => {
    const designRef = ref(database, `designs/${designId}`);
    await update(designRef, { likes: currentLikes + 1 });
  };

  // Handle dislike
  const handleDislike = async (designId, currentDislikes) => {
    const designRef = ref(database, `designs/${designId}`);
    await update(designRef, { dislikes: currentDislikes + 1 });
  };

  // Handle comment submission
  const handleCommentSubmit = async (designId) => {
    if (!commentName || !commentText) {
      alert('Please fill in both name and comment!');
      return;
    }

    const commentRef = push(ref(database, `designs/${designId}/comments`));
    await set(commentRef, {
      name: commentName,
      text: commentText,
      status: 'pending',
      timestamp: Date.now()
    });

    setCommentName('');
    setCommentText('');
    alert('Comment submitted for approval!');
  };

  // Approve comment
  const handleApproveComment = async (designId, commentId) => {
    const commentRef = ref(database, `designs/${designId}/comments/${commentId}`);
    await update(commentRef, { status: 'approved' });
  };

  // Reject comment
  const handleRejectComment = async (designId, commentId) => {
    const commentRef = ref(database, `designs/${designId}/comments/${commentId}`);
    await remove(commentRef);
  };

  // Delete design
  const handleDeleteDesign = async (designId) => {
    if (window.confirm('Are you sure you want to delete this design?')) {
      const designRef = ref(database, `designs/${designId}`);
      await remove(designRef);
    }
  };

  // Get pending comments count
  const getPendingCommentsCount = () => {
    let count = 0;
    designs.forEach(design => {
      design.comments?.forEach(comment => {
        if (comment.status === 'pending') count++;
      });
    });
    return count;
  };

  // Admin Login Page
  if (currentPage === 'admin-login') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-cream-100 to-amber-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-8">
            <Scissors className="w-16 h-16 mx-auto text-amber-600 mb-4" />
            <h2 className="text-3xl font-bold text-gray-900">Admin Login</h2>
            <p className="text-gray-600 mt-2">Nelly J Stitches Dashboard</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Username"
              value={adminUsername}
              onChange={(e) => setAdminUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <input
              type="password"
              placeholder="Password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAdminLogin()}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <button
              onClick={handleAdminLogin}
              className="w-full bg-amber-600 text-white py-3 rounded-lg hover:bg-amber-700 transition-all font-semibold"
            >
              Login
            </button>
            <button
              onClick={() => setCurrentPage('home')}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-all"
            >
              Back to Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  if (currentPage === 'admin' && isAdmin) {
    const pendingCount = getPendingCommentsCount();
    
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Admin Header */}
        <div className="bg-white shadow-md p-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">🎨 Nelly J Admin</h1>
          <button
            onClick={handleAdminLogout}
            className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        <div className="max-w-7xl mx-auto p-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-gray-600 text-sm font-semibold">Total Designs</h3>
              <p className="text-4xl font-bold text-amber-600 mt-2">{designs.length}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-gray-600 text-sm font-semibold">Total Likes</h3>
              <p className="text-4xl font-bold text-red-500 mt-2">
                {designs.reduce((sum, d) => sum + (d.likes || 0), 0)}
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-gray-600 text-sm font-semibold">Pending Comments</h3>
              <p className="text-4xl font-bold text-yellow-600 mt-2">{pendingCount}</p>
            </div>
          </div>

          {/* Upload Button */}
          <button
            onClick={() => setShowUploadForm(!showUploadForm)}
            className="w-full bg-amber-600 text-white py-4 rounded-lg hover:bg-amber-700 transition-all font-semibold mb-6 flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            {showUploadForm ? 'Cancel Upload' : '📸 Upload New Design'}
          </button>

          {/* Upload Form */}
          {showUploadForm && (
            <div className="bg-white p-6 rounded-lg shadow-md mb-8">
              <h3 className="text-xl font-bold mb-4">Upload New Design</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Design Title"
                  value={newDesign.title}
                  onChange={(e) => setNewDesign({...newDesign, title: e.target.value})}
                  className="w-full px-4 py-3 border rounded-lg"
                />
                <select
                  value={newDesign.category}
                  onChange={(e) => setNewDesign({...newDesign, category: e.target.value})}
                  className="w-full px-4 py-3 border rounded-lg"
                >
                  <option>Bridal</option>
                  <option>Casual</option>
                  <option>Corporate</option>
                  <option>Aso-ebi</option>
                </select>
                <textarea
                  placeholder="Description"
                  value={newDesign.description}
                  onChange={(e) => setNewDesign({...newDesign, description: e.target.value})}
                  className="w-full px-4 py-3 border rounded-lg h-24"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setNewDesign({...newDesign, image: e.target.files[0]})}
                  className="w-full px-4 py-3 border rounded-lg"
                />
                <button
                  onClick={handleDesignUpload}
                  disabled={uploading}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {uploading ? 'Uploading...' : 'Post Design ✓'}
                </button>
              </div>
            </div>
          )}

          {/* Pending Comments */}
          {pendingCount > 0 && (
            <div className="bg-yellow-50 border-2 border-yellow-400 p-6 rounded-lg mb-8">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
                📬 Pending Comments ({pendingCount})
              </h3>
              <div className="space-y-4">
                {designs.map(design => 
                  design.comments?.filter(c => c.status === 'pending').map(comment => (
                    <div key={comment.id} className="bg-white p-4 rounded-lg shadow">
                      <p className="font-semibold text-sm text-gray-600">Design: {design.title}</p>
                      <p className="font-semibold mt-2">From: {comment.name}</p>
                      <p className="text-gray-700 mt-1">"{comment.text}"</p>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleApproveComment(design.id, comment.id)}
                          className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 flex items-center gap-1"
                        >
                          <Check className="w-4 h-4" /> Approve
                        </button>
                        <button
                          onClick={() => handleRejectComment(design.id, comment.id)}
                          className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 flex items-center gap-1"
                        >
                          <X className="w-4 h-4" /> Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* All Designs */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-bold mb-4">🎨 All Designs</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {designs.map(design => (
                <div key={design.id} className="border rounded-lg overflow-hidden">
                  <img src={design.imageUrl} alt={design.title} className="w-full h-48 object-cover" />
                  <div className="p-4">
                    <h4 className="font-bold">{design.title}</h4>
                    <p className="text-sm text-gray-600">{design.category}</p>
                    <div className="flex gap-2 mt-3 text-sm">
                      <span>❤️ {design.likes || 0}</span>
                      <span>💬 {design.comments?.filter(c => c.status === 'approved').length || 0}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteDesign(design.id)}
                      className="w-full mt-3 bg-red-500 text-white py-2 rounded hover:bg-red-600 flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Public Website
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-amber-50">
      {/* Header */}
      <header className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        headerTransparent ? 'bg-white/90 backdrop-blur-md shadow-lg' : 'bg-white shadow-md'
      }`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Scissors className="w-8 h-8 text-amber-600" />
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Nelly J Stitches</h1>
          </div>
          
          {/* Desktop Menu */}
          <nav className="hidden md:flex gap-8 text-gray-700 font-medium">
            <a href="#home" className="hover:text-amber-600 transition-colors">Home</a>
            <a href="#designs" className="hover:text-amber-600 transition-colors">Designs</a>
            <a href="#about" className="hover:text-amber-600 transition-colors">About</a>
            <a href="#contact" className="hover:text-amber-600 transition-colors">Contact</a>
          </nav>

          {/* Mobile Menu Button */}
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden">
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <nav className="flex flex-col gap-4 p-4">
              <a href="#home" className="hover:text-amber-600">Home</a>
              <a href="#designs" className="hover:text-amber-600">Designs</a>
              <a href="#about" className="hover:text-amber-600">About</a>
              <a href="#contact" className="hover:text-amber-600">Contact</a>
            </nav>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
            Handcrafted Elegance
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 mb-8">
            Custom tailoring made with perfection
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="#designs" className="bg-amber-600 text-white px-8 py-4 rounded-lg hover:bg-amber-700 transition-all font-semibold">
              View Designs
            </a>
            <a href="https://wa.me/2348012345678" className="bg-gray-900 text-white px-8 py-4 rounded-lg hover:bg-gray-800 transition-all font-semibold">
              Book a Fitting
            </a>
          </div>
        </div>
      </section>

      {/* Designs Feed */}
      <section id="designs" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Latest Designs</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {designs.map(design => (
              <div key={design.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-2xl transition-all">
                <img 
                  src={design.imageUrl} 
                  alt={design.title}
                  className="w-full h-80 object-cover"
                />
                
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-2">{design.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">{design.category}</p>
                  <p className="text-gray-700 mb-4">{design.description}</p>
                  
                  {/* Like/Dislike/Comment */}
                  <div className="flex gap-6 mb-4 text-gray-600">
                    <button 
                      onClick={() => handleLike(design.id, design.likes || 0)}
                      className="flex items-center gap-2 hover:text-red-500 transition-colors"
                    >
                      <Heart className="w-5 h-5" />
                      <span>{design.likes || 0}</span>
                    </button>
                    <button 
                      onClick={() => handleDislike(design.id, design.dislikes || 0)}
                      className="flex items-center gap-2 hover:text-gray-800 transition-colors"
                    >
                      <ThumbsDown className="w-5 h-5" />
                      <span>{design.dislikes || 0}</span>
                    </button>
                    <button 
                      onClick={() => setSelectedDesign(design)}
                      className="flex items-center gap-2 hover:text-amber-600 transition-colors"
                    >
                      <MessageCircle className="w-5 h-5" />
                      <span>{design.comments?.filter(c => c.status === 'approved').length || 0}</span>
                    </button>
                  </div>

                  {/* Approved Comments */}
                  {design.comments?.filter(c => c.status === 'approved').slice(0, 2).map(comment => (
                    <div key={comment.id} className="border-t pt-3 mt-3">
                      <p className="font-semibold text-sm">{comment.name}</p>
                      <p className="text-sm text-gray-600">{comment.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comment Modal */}
      {selectedDesign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Comments</h3>
              <button onClick={() => setSelectedDesign(null)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Approved Comments */}
            <div className="space-y-4 mb-6">
              {selectedDesign.comments?.filter(c => c.status === 'approved').map(comment => (
                <div key={comment.id} className="border-b pb-3">
                  <p className="font-semibold">{comment.name}</p>
                  <p className="text-gray-700">{comment.text}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(comment.timestamp).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>

            {/* Add Comment */}
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Your Name"
                value={commentName}
                onChange={(e) => setCommentName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
              <textarea
                placeholder="Your Comment"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg h-24"
              />
              <button
                onClick={() => handleCommentSubmit(selectedDesign.id)}
                className="w-full bg-amber-600 text-white py-3 rounded-lg hover:bg-amber-700 transition-all"
              >
                Submit Comment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Section */}
      <section id="about" className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">About Nelly J Stitches</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-8">
            With years of passion and craftsmanship, Nelly J Stitches brings you custom-tailored 
            elegance that fits perfectly. Every stitch tells a story of dedication, quality, 
            and timeless fashion.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="bg-amber-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Scissors className="w-10 h-10 text-amber-600" />
              </div>
              <h3 className="font-bold text-xl mb-2">Custom Fitting</h3>
              <p className="text-gray-600">Perfect fit for every body type</p>
            </div>
            <div className="text-center">
              <div className="bg-amber-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-10 h-10 text-amber-600" />
              </div>
              <h3 className="font-bold text-xl mb-2">Quality Fabric</h3>
              <p className="text-gray-600">Premium materials only</p>
            </div>
            <div className="text-center">
              <div className="bg-amber-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Send className="w-10 h-10 text-amber-600" />
              </div>
              <h3 className="font-bold text-xl mb-2">Fast Delivery</h3>
              <p className="text-gray-600">On-time, every time</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-amber-600 to-amber-800 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Your Style, Perfectly Stitched</h2>
          <p className="text-xl mb-8">Ready to create your dream outfit?</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <a href="https://wa.me/2348012345678" className="bg-white text-amber-600 px-8 py-4 rounded-lg hover:bg-gray-100 transition-all font-semibold flex items-center gap-2">
              <Phone className="w-5 h-5" />
              WhatsApp Order
            </a>
            <a href="#contact" className="bg-amber-900 text-white px-8 py-4 rounded-lg hover:bg-amber-950 transition-all font-semibold">
              Book Appointment
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="bg-gray-900 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Scissors className="w-8 h-8 text-amber-400" />
                <h3 className="text-2xl font-bold">Nelly J Stitches</h3>
              </div>
              <p className="text-gray-400">Handcrafted elegance, custom tailoring made with perfection.</p>
            </div>
            
            <div>
              <h4 className="font-bold text-lg mb-4">Contact</h4>
              <div className="space-y-3 text-gray-400">
                <div className="flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  <span>+234 801 234 5678</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span>Lagos, Nigeria</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-lg mb-4">Follow Us</h4>
              <div className="flex gap-4">
                <a href="https://instagram.com/nellyjstitches" className="hover:text-amber-400 transition-colors">
                  <Instagram className="w-6 h-6" />
                </a>
                <a href="https://wa.me/2348012345678" className="hover:text-amber-400 transition-colors">
                  <Phone className="w-6 h-6" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-400">
            <p>&copy; 2025 Nelly J Stitches. All rights reserved.</p>
            {!isAdmin && (
              <button
                onClick={() => setCurrentPage('admin-login')}
                className="text-xs text-gray-600 hover:text-gray-400 mt-2"
              >
                •
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
