
describe('Evaluate Tag Tests', function () {

  beforeEach(() => {

    cy.visit('/test')

  })


  it('evaluate numeric and symbolic', () => {
    cy.window().then((win) => {
      win.postMessage({
        doenetML: `
  <text>a</text>
  <p>Variable: <mathinput name="variable" prefill="x" /></p>
  <p>Function: <mathinput name="formula" prefill="sin(x)"/></p>
  <p>Input value: <mathinput name="input" prefill="0" /></p>

  <function name="f_symbolic" variable="$variable" symbolic>
    <formula>$formula</formula>
  </function>

  <function name="f_numeric" variable="$variable">
    <formula>$formula</formula>
  </function>

  <p>Evaluate symbolic: 
    <evaluate name="result_symbolic">
      <copy tname="f_symbolic" />
      <input>$input</input>
    </evaluate>
  </p>

  <p name="p_symbolic2">Evaluate symbolic using macro:  <math name="result_symbolic2">$$f_symbolic($input)</math></p>

  <p>Evaluated symbolic result again: <copy prop="evaluatedResult" tname="result_symbolic" assignNames="result_symbolic3" /></p>


  <p>Evaluate numeric: 
    <evaluate name="result_numeric">
      <copy tname="f_numeric" />
      <input>$input</input>
    </evaluate>
  </p>

  <p>Evaluate numeric using macro:  <math name="result_numeric2">$$f_numeric($input)</math></p>


  <p>Evaluated numeric result again: <copy prop="evaluatedResult" tname="result_numeric" assignNames="result_numeric3" /></p>

  `}, "*");
    });

    cy.get('#\\/_text1').should('have.text', 'a');  // to wait for page to load

    cy.log('initial state');
    cy.get('#\\/result_symbolic').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim()).equal('sin(0)')
    })
    cy.get('#\\/result_symbolic2').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim()).equal('sin(0)')
    })
    cy.get('#\\/result_symbolic3').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim()).equal('sin(0)')
    })
    cy.get('#\\/result_numeric').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim()).equal('0')
    })
    cy.get('#\\/result_numeric2').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim()).equal('0')
    })
    cy.get('#\\/result_numeric3').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim()).equal('0')
    })

    cy.window().then((win) => {
      let components = Object.assign({}, win.state.components);
      expect(components['/result_symbolic'].stateValues.value.tree).eqls(["apply", "sin", 0]);
      expect(components['/result_symbolic2'].stateValues.value.tree).eqls(["apply", "sin", 0]);
      expect(components['/result_symbolic3'].stateValues.value.tree).eqls(["apply", "sin", 0]);
      expect(components['/result_numeric'].stateValues.value.tree).eq(0);
      expect(components['/result_numeric2'].stateValues.value.tree).eq(0);
      expect(components['/result_numeric3'].stateValues.value.tree).eq(0);
    })

    
    cy.log('evaluate at pi')
    cy.get('#\\/input_input').clear().type("pi{enter}");
    cy.get('#\\/result_symbolic').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim()).equal('sin(π)')
    })
    cy.get('#\\/result_symbolic2').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim()).equal('sin(π)')
    })
    cy.get('#\\/result_symbolic3').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim()).equal('sin(π)')
    })
    cy.get('#\\/result_numeric').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim().slice(0,9)).eq(Math.sin(Math.PI).toString().slice(0,9))
    })
    cy.get('#\\/result_numeric2').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim().slice(0,9)).eq(Math.sin(Math.PI).toString().slice(0,9))
    })
    cy.get('#\\/result_numeric3').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim().slice(0,9)).eq(Math.sin(Math.PI).toString().slice(0,9))
    })

    cy.window().then((win) => {
      let components = Object.assign({}, win.state.components);
      expect(components['/result_symbolic'].stateValues.value.tree).eqls(["apply", "sin", "pi"]);
      expect(components['/result_symbolic2'].stateValues.value.tree).eqls(["apply", "sin", "pi"]);
      expect(components['/result_symbolic3'].stateValues.value.tree).eqls(["apply", "sin", "pi"]);
      expect(components['/result_numeric'].stateValues.value.tree).closeTo(0, 1E-10);
      expect(components['/result_numeric2'].stateValues.value.tree).closeTo(0, 1E-10);
      expect(components['/result_numeric3'].stateValues.value.tree).closeTo(0, 1E-10);
    })


    cy.log('change variable')
    cy.get('#\\/variable_input').clear().type("y{enter}");
    cy.get('#\\/result_symbolic').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim()).equal('sin(x)')
    })
    cy.get('#\\/result_symbolic2').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim()).equal('sin(x)')
    })
    cy.get('#\\/result_symbolic3').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim()).equal('sin(x)')
    })
    cy.get('#\\/result_numeric').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim()).equal('NaN')
    })
    cy.get('#\\/result_numeric2').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim()).equal('NaN')
    })
    cy.get('#\\/result_numeric3').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim()).equal('NaN')
    })


    cy.window().then((win) => {
      let components = Object.assign({}, win.state.components);
      expect(components['/result_symbolic'].stateValues.value.tree).eqls(["apply", "sin", "x"])
      expect(components['/result_symbolic2'].stateValues.value.tree).eqls(["apply", "sin", "x"])
      expect(components['/result_symbolic3'].stateValues.value.tree).eqls(["apply", "sin", "x"])
      assert.isNaN(components['/result_numeric'].stateValues.value.tree);
      assert.isNaN(components['/result_numeric2'].stateValues.value.tree);
      assert.isNaN(components['/result_numeric3'].stateValues.value.tree);

    })

    cy.log('change formula to match variable')
    cy.get('#\\/formula_input').clear().type("sin(y){enter}");
    cy.get('#\\/result_symbolic').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim()).equal('sin(π)')
    })
    cy.get('#\\/result_symbolic2').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim()).equal('sin(π)')
    })
    cy.get('#\\/result_symbolic3').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim()).equal('sin(π)')
    })
    cy.get('#\\/result_numeric').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim().slice(0,9)).eq(Math.sin(Math.PI).toString().slice(0,9))
    })
    cy.get('#\\/result_numeric2').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim().slice(0,9)).eq(Math.sin(Math.PI).toString().slice(0,9))
    })
    cy.get('#\\/result_numeric3').find('.mjx-mrow').eq(0).invoke('text').then((text) => {
      expect(text.trim().slice(0,9)).eq(Math.sin(Math.PI).toString().slice(0,9))
    })

    cy.window().then((win) => {
      let components = Object.assign({}, win.state.components);
      expect(components['/result_symbolic'].stateValues.value.tree).eqls(["apply", "sin", "pi"]);
      expect(components['/result_symbolic2'].stateValues.value.tree).eqls(["apply", "sin", "pi"]);
      expect(components['/result_symbolic3'].stateValues.value.tree).eqls(["apply", "sin", "pi"]);
      expect(components['/result_numeric'].stateValues.value.tree).closeTo(0, 1E-10);
      expect(components['/result_numeric2'].stateValues.value.tree).closeTo(0, 1E-10);
      expect(components['/result_numeric3'].stateValues.value.tree).closeTo(0, 1E-10);
    })

  })

})



