install: ##do all the npm commands to run the project
	npm install
	npm run build
	upm link

test: #run test suite 
	npm test

test_example: ##run test using the manifest file
	if-run --manifest test.yml
