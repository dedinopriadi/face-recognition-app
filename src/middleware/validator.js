const {body, validationResult} = require('express-validator');

// Validation rules for the enroll endpoint
const enrollValidationRules = () => {
  return [
    // name must not be empty
    body('name')
      .notEmpty()
      .withMessage('Name field cannot be empty')
      .trim()
      .escape()
      .isLength({min: 3, max: 50})
      .withMessage('Name must be between 3 and 50 characters'),

    // image must exist (checked by multer, but good to have a placeholder)
    body('image').custom((value, {req}) => {
      if (!req.file) {
        throw new Error('Image file is required');
      }
      return true;
    }),
  ];
};

// Validation rules for the recognize endpoint
const recognizeValidationRules = () => {
  return [
    // image must exist
    body('image').custom((value, {req}) => {
      if (!req.file) {
        throw new Error('Image file is required');
      }
      return true;
    }),
  ];
};

// Middleware to handle validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  const extractedErrors = [];
  errors.array().map(err => extractedErrors.push({[err.path]: err.msg}));

  return res.status(422).json({
    errors: extractedErrors,
  });
};

module.exports = {
  enrollValidationRules,
  recognizeValidationRules,
  validate,
};
