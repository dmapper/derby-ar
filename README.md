# derby-ar
Plugin for helping writing ActiveRecord style/pattern code for Derby

How to use
==========
After adding the plugin:

```coffee
derby.use require 'derby-ar'
```

One can add model layer code automatically to the model layer:

```coffee

{ChildModel} = derby.Model

class CollectionConstructor extends ChildModel
    doSomethingWithCollection: ->

class ItemConstructor extends ChildModel
    doSomethingWithItem: ->

class Base extends ChildModel
  method2: ->
    'method2'

class SubDocFirstConstructor extends Base
  method1: ->
    'first'

class SubDocSecondConstructor extends Base
  method1: ->
    'second'

class SubdocFactory
  factory: true
  constructor: (model, self) ->
    return switch model.get('type')
      when 'first' 
        new SubDocFirstConstructor(self)
      when 'second' 
        new SubDocSecondConstructor(self)

derby.model('items', "items", CollectionConstructor);
derby.model('item', "items.*", ItemConstructor);
derby.model 'subdoc', 'items.*.subdoc.*', SubdocFactory

...
myCollection = model.at('myCollection')
myCollection.subscribe ->
  myCollection.doSomethingWithCollection()

  myItem = myCollection.at('<id of myItem>')

  myItem.doSomethingWithItem()
...
```