import React from 'react';
import Tool from '../Tools/_framework/Tool';
import logo from '../Media/Doenet_Logo_Frontpage.png';
import doenetImage from '../Media/Doenet_Logo_cloud_only.png';
import styled from 'styled-components';
import './homepage.css';

const ToolName = styled.span`
  font-size: 20px;
  color: #333333;
  font-weight: 700;
  margin-left: 10px;
`;
const Headings = styled.h1`
  line-height: 1.1em;
`;

const DoenetLogo = styled.div`
  display: flex;
  position: relative;
  width: 100%;
  min-height: 340px;
  background-color: #e3e2e2;
  justify-content: center;
  align-items: center;
`;
const DoenetImage = styled.img`
  @media (max-width: 768px) {
    width: 500px;
  }
`;

const CloudColor = styled.div`
  background-color: #fff;
  color: #333333;
`;
const CloudColorSection = styled(CloudColor)`
  padding: 20px 10px 60px 10px;
  margin: 0px;
  justify-content: center;
  align-items: center;
  text-align: center;
`;

const ChoclateColor = styled.div`
  background-color: #6d4445;
  color: #e3d2d2;
`;
const ChoclateColorSection = styled(ChoclateColor)`
  padding: 20px 10px 60px 10px;
  margin: 0px;
  justify-content: center;
  align-items: center;
  text-align: center;
`;
const ShadowColor = styled.div`
  background-color: #e3d2d2;
  color: #333333;
`;
const ShadowColorSection = styled(ShadowColor)`
  padding: 20px 10px 60px 10px;
  margin: 0px;
  justify-content: center;
  align-items: center;
  text-align: center;
`;
const SectionText = styled.div`
  text-align: center;
  max-width: 800px;
  display: inline-block;
  margin-left: 3em;
  margin-right: 3em;
`;

const ParagraphTags = styled.p`
  text-align: left;
  display: block;
  margin-block-start: 1em;
  margin-block-end: 1em;
  margin-inline-start: 0px;
  margin-inline-end: 0px;
  @media (max-width: 768px) {
    margin-left: 1em;
    margin-right: 1em;
    text-align: left;
    display: block;
  }
`;

const Footer = styled.div`
  background-color: #e3e2e2;
  color: #333333;
  font-size: 14px;
  padding: 20px 40px;
  text-align: center;
`;
export default function DoenetHomePage() {
  return (
    <Tool>
      <headerPanel>
        <img id="doenetLogo" src={doenetImage} height="40px" />
        <ToolName>Announcements</ToolName>
      </headerPanel>

      <mainPanel>
        <DoenetLogo>
          <DoenetImage src={logo} />
        </DoenetLogo>
        <CloudColorSection>
          <SectionText>
            <Headings>The Distributed Open Education Network</Headings>
            <h4 style={{ marginTop: '0px' }}>
              The free and open data-driven educational technology platform
            </h4>
            <ParagraphTags>
              The Distributed Open Education Network (Doenet) is, at its core, a
              mechanism for measuring and sharing student interactions with web
              pages and storing anonymized data in an open distributed data
              warehouse. The Doenet platform will include tools for authoring
              interactive educational content, conducting educational research
              using the content, and discovering the most effective content
              based on the research results.{' '}
            </ParagraphTags>

            <ParagraphTags>
              The Doenet platform is just getting started. We are excited to
              introduce early versions of two projects: DoenetML, a markup
              language for authoring interactive online activities, and
              DoenetAPI, a library for connecting web pages to the Doenet data
              layer, enabling tracking of student data across web pages and
              multiuser interactives.
            </ParagraphTags>

            <ParagraphTags>
              For more background and information on the Doenet project, see{' '}
              <a
                style={{ color: '#6d4445' }}
                href="https://www.mathvalues.org/masterblog/reimagining-online-mathematics"
              >
                this MAA DUE Point article
              </a>
            </ParagraphTags>
          </SectionText>
        </CloudColorSection>

        <ChoclateColorSection>
          <SectionText>
            <Headings className="section-headline">
              Introducing DoenetML
            </Headings>
            <ParagraphTags>
              The markup language DoenetML allows you to build richly
              interactive activities by focusing on the meaning of the elements
              you wish to create. Based on{' '}
              <a href="http://pretextbook.org">PreTeXt</a>, DoenetML looks
              similar to HTML, with descriptive tags such as{' '}
              <code>&lt;point&gt;</code>, <code>&lt;intersection&gt;</code>, and{' '}
              <code>&lt;answer&gt;</code>.
            </ParagraphTags>

            <ParagraphTags>
              We expect to release examples of DoenetML soon.
            </ParagraphTags>
          </SectionText>
        </ChoclateColorSection>
        <ShadowColorSection>
          <SectionText>
            <Headings className="section-headline">Timeline</Headings>
            <ParagraphTags>
              In Fall 2020, we piloted Doenet in a small number of courses. We
              used Doenet for both content delivery and learning experiments and
              performed analysis on the effectiveness of the materials.
            </ParagraphTags>
            <ParagraphTags>
              We will expand the use of Doenet to include more courses at the
              University of Minnesota, Ohio State University and Ithaca College.
              Starting in Fall 2021, we expect Doenet to be available to
              instructors at other institutions on a limited basis.
            </ParagraphTags>
          </SectionText>
        </ShadowColorSection>
        <Footer>
          <SectionText>
            <div>
              <h4 style={{ marginBottom: '0px' }}>Contact us</h4>
              <div style={{ marginBottom: '40px' }}>
                <a href="mailto:info@doenet.org">info@doenet.org</a>
              </div>
              <p>
                <a
                  rel="license"
                  href="http://creativecommons.org/licenses/by/4.0/"
                >
                  <img
                    alt="Creative Commons License"
                    style={{ borderWidth: 0 }}
                    src="https://i.creativecommons.org/l/by/4.0/88x31.png"
                  />
                </a>
                <br />
                This work is licensed under a{' '}
                <a
                  rel="license"
                  href="http://creativecommons.org/licenses/by/4.0/"
                >
                  Creative Commons Attribution 4.0 International License
                </a>
                .
              </p>
              <p>
                Doenet is a collaborative project involving the University of
                Minnesota, the Ohio State University, and Ithaca College, with
                support from the National Science Foundation (DUE-1915294,
                DUE-1915363, DUE-1915438). Any opinions, findings, and
                conclusions or recommendations expressed in this material are
                those of the author(s) and do not necessarily reflect the views
                of the National Science Foundation.{' '}
              </p>
            </div>
          </SectionText>
        </Footer>
      </mainPanel>
    </Tool>
  );
}
