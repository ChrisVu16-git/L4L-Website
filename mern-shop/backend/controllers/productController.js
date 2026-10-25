import Product from '../models/Product.js';
import { cleanupCloudinaryImageUnused } from '../utils/cloudinaryImage.js';

const isValidProductId = (id) => /^[0-9a-fA-F]{24}$/.test(id);
const isValidImageUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) {
    return false;
  }

  try {
    const url = new URL(value.trim());

    return (
      (url.protocol === 'https:' || url.protocol === 'http:') &&
      url.hostname.includes('.') &&
      url.hostname !== 'example.com' &&
      !url.hostname.endsWith('.example.com')
    );
  } catch {
    return false;
  }
};

export const getProducts = async (req, res) => {
  const keyword = req.query.keyword
    ? {
        $or: [
          { name: { $regex: req.query.keyword, $options: 'i' } },
          { description: { $regex: req.query.keyword, $options: 'i' } },
        ],
      } :
       {};
  const category = req.query.category ? { category: req.query.category } : {};
  const products = await Product.find({ ...keyword, ...category }).sort({ createdAt: -1 });
  res.json(products);
};


export const getProductById = async (req, res) => {
  if (!isValidProductId(req.params.id)) {
    return res.status(400).json({
      message: 'Invalid product ID',
    });
  }
  const product = await Product.findById(req.params.id);
  if (product) {
    return res.json(product);
  } else {
    return res.status(404).json({ message: 'Product not found' });
  }
};


export const createProduct = async (req, res) => {
  const {
    name,
    description,
    price,
    category,
    image,
    imagePublicId,
    countInStock,
  } = req.body;

  if (
    !name?.trim() ||
    !description?.trim() ||
    price === undefined ||
    !category?.trim() ||
    !isValidImageUrl(image) ||
    countInStock === undefined
  ) {
    return res.status(400).json({
      message: 'Please provide all required product fields',
    });
  }

  const parsedPrice = Number(price);
  const parsedStock = Number(countInStock);

  if (
    !Number.isFinite(parsedPrice) ||
    parsedPrice < 0 ||
    !Number.isInteger(parsedStock) ||
    parsedStock < 0
  ) {
    return res.status(400).json({
      message: 'Price must be non-negative and stock must be a non-negative integer',
    });
  }

  const product = await Product.create({
    name: name.trim(),
    description: description.trim(),
    price: parsedPrice,
    category: category.trim(),
    image: image.trim(),
    imagePublicId: imagePublicId || null,
    countInStock: parsedStock,
  });

  res.status(201).json(product);
};


export const updateProduct = async (req, res) => {
  if (!isValidProductId(req.params.id)) {
    return res.status(400).json({
      message: 'Invalid product ID',
  });
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({
      message: 'Product not found',
    });
  }

  const oldImagePublicId = product.imagePublicId
  const oldImageUrl = product.image

  const allowedFields = [
    'name',
    'description',
    'price',
    'category',
    'image',
    'imagePublicId',
    'countInStock',
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      product[field] = req.body[field];
    }
  }

  // If the URL changes without a new Cloudinary ID, don't keep
  // the old ID attached to the new URL.
  if (
    req.body.image !== undefined &&
    req.body.image !== oldImageUrl &&
    req.body.imagePublicId === undefined
  ) {
    product.imagePublicId = null
  }

  if (
    (product.name !== undefined &&
      (typeof product.name !== 'string' || !product.name.trim())) ||
    (product.description !== undefined &&
      (typeof product.description !== 'string' || !product.description.trim())) ||
    (product.category !== undefined &&
      (typeof product.category !== 'string' || !product.category.trim())) ||
    (product.image !== undefined &&
      !isValidImageUrl(product.image)) ||
    !Number.isFinite(Number(product.price)) ||
    Number(product.price) < 0 ||
    !Number.isInteger(Number(product.countInStock)) ||
    Number(product.countInStock) < 0
  ) {
    return res.status(400).json({
      message: 'Invalid product fields',
    });
  }

  product.price = Number(product.price);
  product.countInStock = Number(product.countInStock);

  const updatedProduct = await product.save();
  if (
    oldImagePublicId &&
    oldImagePublicId !== updateProduct.imagePublicId
  ) {
    await cleanupCloudinaryImageUnused(
      oldImagePublicId,
      updateProduct._id
    )
  }
  res.json(updatedProduct);
};


export const deleteProduct = async (req, res) => {
  if (!isValidProductId(req.params.id)) {
    return res.status(400).json({
      message: 'Invalid product ID',
  });
  }
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const oldImagePublicId = product.imagePublicId;

  await product.deleteOne();

  if (oldImagePublicId) {
    await cleanupCloudinaryImageUnused(oldImagePublicId);
  }

  res.json({ message: 'Product removed' });
};

export const createProductReview = async (req, res) => {
   if (!isValidProductId(req.params.id)) {
    return res.status(400).json({
      message: 'Invalid product ID',
    });
  }
  const { rating, comment } = req.body;
  const product = await Product.findById(req.params.id);

  if (!product) {
    return res.status(404).json({ message: 'Product not found' });
  }

  const alreadyReviewed = product.reviews.find(
    (r) => r.user.toString() === req.user._id.toString()
  );

  if (alreadyReviewed) {
    return res.status(400).json({ message: 'Product already reviewed' });
  }

  const review = {
    name: req.user.name,
    rating: Number(rating),
    comment,
    user: req.user._id,
  };

  product.reviews.push(review);
  product.numReviews = product.reviews.length;
  product.rating =
    product.reviews.reduce((acc, item) => item.rating + acc, 0) / product.reviews.length;

  await product.save();
  res.status(201).json({ message: 'Review added' });
};

export const getCategories = async (_req, res) => {
  const categories = await Product.distinct('category');
  res.json(categories);
};
