/**
 * Part Model (Vehicle Parts/Spares)
 */

const mongoose = require('mongoose');
const slugify = require('slugify');

const partSchema = new mongoose.Schema({
  // Basic Info
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  slug: {
    type: String,
    unique: true
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  
  // Part Details
  partName: {
    type: String,
    required: [true, 'Part name is required'],
    trim: true
  },
  partNumber: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'engine',
      'transmission',
      'suspension',
      'brakes',
      'electrical',
      'body',
      'interior',
      'exterior',
      'wheels_tires',
      'exhaust',
      'cooling',
      'fuel_system',
      'lights',
      'accessories',
      'other'
    ]
  },
  
  // Compatibility
  compatibility: {
    makes: [{
      type: String,
      required: true
    }],
    models: [{
      type: String
    }],
    years: [{
      type: Number
    }],
    isUniversal: {
      type: Boolean,
      default: false
    }
  },
  
  // Condition
  condition: {
    type: String,
    required: [true, 'Condition is required'],
    enum: ['new', 'used', 'refurbished', 'salvage', 'oem', 'aftermarket']
  },
  
  // Pricing
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD'
  },
  priceNegotiable: {
    type: Boolean,
    default: true
  },
  
  // Swap Options
  openToSwap: {
    type: Boolean,
    default: false
  },
  swapPreferences: {
    acceptedPartCategories: [{
      type: String
    }],
    additionalNotes: String
  },
  
  // Stock & Quantity
  quantity: {
    type: Number,
    default: 1,
    min: [0, 'Quantity cannot be negative']
  },
  inStock: {
    type: Boolean,
    default: true
  },
  
  // Media
  images: [{
    public_id: String,
    url: {
      type: String,
      required: true
    },
    thumbnail: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  
  // Location
  location: {
    city: {
      type: String,
      required: [true, 'City is required']
    },
    region: String,
    country: {
      type: String,
      required: [true, 'Country is required']
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true
      }
    }
  },
  
  // Seller
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Status
  status: {
    type: String,
    enum: ['active', 'sold', 'swapped', 'pending', 'inactive'],
    default: 'active'
  },
  
  // Features
  isFeatured: {
    type: Boolean,
    default: false
  },
  featuredUntil: Date,
  
  // Specifications
  specifications: {
    weight: String,
    dimensions: String,
    material: String,
    brand: String,
    manufacturer: String,
    warranty: String,
    other: mongoose.Schema.Types.Mixed
  },
  
  // Views & Engagement
  views: {
    type: Number,
    default: 0
  },
  contactCount: {
    type: Number,
    default: 0
  },
  
  // Flags
  flags: {
    isReported: {
      type: Boolean,
      default: false
    },
    reportCount: {
      type: Number,
      default: 0
    },
    isVerified: {
      type: Boolean,
      default: false
    }
  },
  
  // Metadata
  expiresAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
partSchema.index({ slug: 1 });
partSchema.index({ seller: 1 });
partSchema.index({ category: 1 });
partSchema.index({ 'compatibility.makes': 1 });
partSchema.index({ price: 1 });
partSchema.index({ status: 1 });
partSchema.index({ 'location.coordinates': '2dsphere' });
partSchema.index({ createdAt: -1 });

// Text search index
partSchema.index({
  title: 'text',
  description: 'text',
  partName: 'text'
});

// Generate slug before saving
partSchema.pre('save', async function(next) {
  if (this.isModified('title') || !this.slug) {
    const baseSlug = slugify(this.title, { lower: true, strict: true });
    let slug = baseSlug;
    let counter = 1;
    
    while (await mongoose.model('Part').findOne({ slug, _id: { $ne: this._id } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    
    this.slug = slug;
  }
  next();
});

// Method to increment views
partSchema.methods.incrementViews = async function() {
  this.views += 1;
  await this.save();
};

// Method to update stock
partSchema.methods.updateStock = async function(quantity) {
  this.quantity = Math.max(0, this.quantity + quantity);
  this.inStock = this.quantity > 0;
  await this.save();
};

const Part = mongoose.model('Part', partSchema);

module.exports = Part;
