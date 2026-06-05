import { validationResult, matchedData } from "express-validator";

export default function validate(req, res, next) {
	const errors = validationResult(req);
	if(!errors.isEmpty()){
		return res.status(400).json({ errors: errors.array()});
	}
	req.validData = matchedData(req);
	next();
}
