const prisma = require('../config/prisma');
const { validationResult } = require('express-validator');

async function createCategory(req, res) {
  const { name } = req.body;
  const userId = req.user.id;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verify the category name does not already exist
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' }, // The key is mode: 'insensitive'
        OR: [
          { userId: null }, // Is it a default category?
          { userId: userId }, // Or does it belong to this user?
        ],
      },
    });

    if (existingCategory) {
      return res.status(409).json({
        message: `You already have a category named '${existingCategory.name}'.`,
      });
    }

    const newCategory = await prisma.category.create({
      data: {
        name: name,
        userId: userId,
      },
    });

    res.status(201).json({
      message: 'Category created successfully',
      category: newCategory,
    });
  } catch (error) {
    // Prisma's error code for a unique constraint violation for @@unique([name, userId])
    if (error.code === 'P2002') {
      return res.status(409).json({
        message: `You already have a category named '${name}'.`,
      });
    }
    console.error('Error creating a category', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function getCategories(req, res) {
  try {
    const userId = req.user.id;
    const categories = await prisma.category.findMany({
      where: {
        OR: [{ userId: userId }, { userId: null }],
      },
      orderBy: [{ userId: 'desc' }, { name: 'asc' }],
    });

    res.status(200).json({
      message: 'Categories fetched successfully',
      categories: categories,
    });
  } catch (error) {
    console.error('Error fetching all categories', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function updateCategory(req, res) {
  const categoryId = parseInt(req.params.categoryId, 10);
  const { name } = req.body;
  const userId = req.user.id;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Verify the category to update exists and belongs to the user.
    const categoryToUpdate = await prisma.category.findUnique({
      where: { id: categoryId, userId: userId },
    });

    if (!categoryToUpdate) {
      return res.status(404).json({
        message: 'Category not found or you do not have permission to edit it.',
      });
    }

    // Verify the new category name to update does not already exist
    const existingCategory = await prisma.category.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive',
        },
        NOT: {
          id: categoryId, // Exclude the current category
        },
        // check for conflicts in both default AND user's own categories
        OR: [
          { userId: null }, // Is it a default category?
          { userId: userId }, // Or does it belong to this user?
        ],
      },
    });

    if (existingCategory) {
      return res.status(409).json({
        message: `You already have a category named '${existingCategory.name}'.`,
      });
    }

    // This inherently checks if the category exists AND belongs to the user
    const updatedCategory = await prisma.category.update({
      where: { id: categoryId, userId: userId },
      data: { name: name },
    });

    res.status(200).json({
      message: 'Category updated successfully',
      category: updatedCategory,
    });
  } catch (error) {
    // Prisma's error code for a unique constraint violation for @@unique([name, userId])
    // Duplicate error
    if (error.code === 'P2002') {
      return res.status(409).json({
        message: `You already have a category named '${name}'.`,
      });
    }
    // Prisma's error code for "record to update not found".
    // This error occurs if the ID doesn't exist OR if the userId doesn't match.
    if (error.code === 'P2025') {
      return res.status(404).json({
        message: 'Category not found or you do not have permission to edit it.',
      });
    }
    console.error('Error updating a category', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

async function deleteCategory(req, res) {
  const categoryId = parseInt(req.params.categoryId, 10);
  const userId = req.user.id;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // STEP 1: Check if this category is being used by any transactions.
    const transactionCount = await prisma.transaction.count({
      where: {
        categoryId: categoryId,
        userId: userId,
      },
    });

    // STEP 2: If the category is in use, send back a specific error.
    if (transactionCount > 0) {
      return res.status(409).json({
        message:
          'Cannot delete category because it is still in use by transactions.',
      });
    }

    // STEP 3: If the category is NOT in use, proceed with the deletion.
    // The delete will only happen if the category ID exists AND belongs to the user.
    const deletedCategory = await prisma.category.delete({
      where: { id: categoryId, userId: userId },
    });

    res.status(200).json({
      message: 'Category deleted successfully',
      category: deletedCategory,
    });
  } catch (error) {
    // Prisma's error code for "record to delete not found".
    if (error.code === 'P2025') {
      return res.status(404).json({
        message:
          'Category not found or you do not have permission to delete it.',
      });
    }
    console.error('Error deleting a category', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = {
  createCategory,
  getCategories,
  updateCategory,
  deleteCategory,
};
