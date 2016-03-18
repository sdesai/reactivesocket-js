#
# Makefile: basic Makefile for template API service
#
# This Makefile is a template for new repos. It contains only repo-specific
# logic and uses included makefiles to supply common targets (javascriptlint,
# jsstyle, restdown, etc.), which are used by other repos as well. You may well
# need to rewrite most of this file, but you shouldn't need to touch the
# included makefiles.
#
# If you find yourself adding support for new targets that could be useful for
# other projects too, you should add these to the original versions of the
# included Makefiles (in eng.git) so that other teams can use them too.
#

#
# Tools
#
TOP		:= $(shell pwd)
NODE_MODULES	:= $(TOP)/node_modules
NODE_BIN	:= $(NODE_MODULES)/.bin
ESLINT		= $(NODE_BIN)/eslint
JSCS		= $(NODE_BIN)/jscs
MOCHA		= $(NODE_BIN)/mocha
IMOCHA		= $(NODE_BIN)/_mocha
ISTANBUL	= $(NODE_BIN)/istanbul
NPM		:= npm
PRIMER		= $(NODE_MODULES)/nf-primer/bin/primer.js

#
# Files
#
#JS_FILES	:= $(wildcard $(TOP)/*.js $(TOP)/lib/**/*.js $(TOP)/test/**/*.js)
LIB_DIR		:= lib
TEST_DIR	:= test
TEST_FILES	:= $(TEST_DIR)/index.js
JS_FILES	:= $(shell find $(LIB_DIR) $(TEST_DIR) -name '*.js')
PRIMER_SCRIPTS	:= $(TOP)/edge/**/*.groovy
SHRINKWRAP	:= npm-shrinkwrap.json

CLEAN_FILES	+= node_modules $(SHRINKWRAP)

#
# Repo-specific targets
#
.PHONY: all
all: node_modules lint style cover

.PHONY: lint
lint: node_modules $(ESLINT) $(JS_FILES)
	$(ESLINT) $(JS_FILES)

.PHONY: style
style: node_modules $(JSCS) $(JS_FILES)
	$(JSCS) $(JS_FILES)

.PHONY: cover
cover: node_modules $(ISTANBUL) $(IMOCHA)
	@rm -rf ./coverage
	$(ISTANBUL) cover --report html $(IMOCHA) -- $(TEST_FILES)

node_modules: package.json
	$(NPM) install -d
	@touch node_modules

.PHONY: test
test: node_modules $(MOCHA)
	$(MOCHA) --full-trace $(TEST_FILES)

.PHONY: check
check: lint style cover

.PHONY: distclean
distclean:
	@rm -rf ./node_modules

.PHONY: primer
primer: node_modules $(PRIMER) $(PRIMER_SCRIPTS)
	$(PRIMER) publish


#
# Debug -- print out a a variable via `make print-FOO`
#
print-%  : ; @echo $* = $($*)

