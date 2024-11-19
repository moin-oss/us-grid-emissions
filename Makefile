install: ##do all the npm commands to run the project
	npm install
	npm run build
	npm link

test: #run test suite 
	npm test

test_example: ##run test using the manifest file
	if !(test -s ./test.yml); then cp sample-input.yml test.yml; fi;
	if-run --manifest test.yml
